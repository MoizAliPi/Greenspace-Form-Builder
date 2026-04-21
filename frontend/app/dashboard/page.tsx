"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ErrorAlert } from "@/components/error-alert";
import { getErrorMessage } from "@/lib/error-message";
import { useAuth } from "@/lib/auth-context";
import { createForm, listMyForms } from "@/lib/forms-api";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const listQuery = useQuery({
    queryKey: ["forms", "list"],
    queryFn: () => listMyForms({ limit: 50, offset: 0 }),
  });

  const createMutation = useMutation({
    mutationFn: () => createForm({ title: "Untitled form" }),
    onSuccess: (form) => {
      void queryClient.invalidateQueries({ queryKey: ["forms", "list"] });
      router.push(`/dashboard/builder/${form.id}`);
    },
  });

  const createError = createMutation.error
    ? getErrorMessage(createMutation.error, "Could not create form.")
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          {user && (
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as {user.email}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating…" : "New form"}
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            Log out
          </button>
        </div>
      </header>

      <ErrorAlert message={createError} />

      <section>
        <h2 className="mb-3 text-lg font-medium text-foreground">Your forms</h2>
        {listQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Loading forms…</p>
        )}
        {listQuery.isError && (
          <ErrorAlert
            message={getErrorMessage(listQuery.error, "Could not load forms.")}
          />
        )}
        {listQuery.data && listQuery.data.items.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No forms yet. Create one to open the builder.
          </p>
        )}
        {listQuery.data && listQuery.data.items.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {listQuery.data.items.map((form) => (
              <li
                key={form.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-accent/50"
              >
                <Link
                  href={`/dashboard/builder/${form.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {form.title}
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/dashboard/forms/${form.id}/responses`}
                    className="text-sm text-primary hover:underline"
                  >
                    Responses
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {form.status === "published" ? "Published" : "Draft"} · /
                    {form.slug}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
