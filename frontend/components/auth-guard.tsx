"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth-context";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace(
        `/login?next=${encodeURIComponent(pathname === "/" ? "/dashboard" : pathname)}`
      );
    }
  }, [isInitialized, user, router, pathname]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}
