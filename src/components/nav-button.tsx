"use client";

import Link, { useLinkStatus } from "next/link";

/**
 * Drop inside any <Link> to show a spinner the moment a navigation starts.
 * Renders nothing while idle. Must be a descendant of <Link>.
 */
export function LinkSpinner({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? "size-4 shrink-0"}`}
      aria-hidden
    />
  );
}

export default function NavButton({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className}>
      {children}
      <LinkSpinner />
    </Link>
  );
}
