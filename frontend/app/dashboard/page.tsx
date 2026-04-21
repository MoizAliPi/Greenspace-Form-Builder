"use client";

import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <p className="text-muted-foreground">Dashboard — coming soon.</p>
        {user && (
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{user.email}</span>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => logout()}
        className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
      >
        Log out
      </button>
    </main>
  );
}
