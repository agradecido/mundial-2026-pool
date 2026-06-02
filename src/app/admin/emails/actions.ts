"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { buildEmailHtml } from "@/lib/email-template";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
}

export async function sendBulkEmail(data: {
  subject: string;
  body: string;
}): Promise<{ sent: number; failed: number; error?: string }> {
  await requireAdmin();

  const users = await prisma.user.findMany({
    where: { email: { not: undefined } },
    select: { email: true, name: true },
  });

  const emails = users.filter((u) => !!u.email) as { email: string; name: string | null }[];

  if (emails.length === 0) return { sent: 0, failed: 0 };

  const html = buildEmailHtml(data.subject, data.body);

  // Resend batch: max 100 per request
  const BATCH = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += BATCH) {
    const chunk = emails.slice(i, i + BATCH);
    const messages = chunk.map((u) => ({
      from: FROM_EMAIL,
      to: u.email,
      subject: data.subject,
      html,
    }));

    try {
      const result = await resend.batch.send(messages);
      // Each item in result.data has an id if successful
      const batchSent = result.data?.length ?? 0;
      sent += batchSent;
      failed += chunk.length - batchSent;
    } catch {
      failed += chunk.length;
    }
  }

  return { sent, failed };
}
