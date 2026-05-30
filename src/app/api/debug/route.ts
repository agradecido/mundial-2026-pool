import { headers } from "next/headers";

export async function GET() {
  const headersList = await headers();
  const host = headersList.get("host");
  const xForwardedHost = headersList.get("x-forwarded-host");
  const xForwardedProto = headersList.get("x-forwarded-proto");
  const referer = headersList.get("referer");

  return Response.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    host,
    xForwardedHost,
    xForwardedProto,
    referer,
  });
}
