"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ErrorAlert } from "@/components/error-alert";
import { formatAnswerForDisplay } from "@/lib/answer-display";
import { sortFieldsByOrder } from "@/lib/builder/form-model";
import { getErrorMessage } from "@/lib/error-message";
import { getForm, listFormResponses } from "@/lib/forms-api";
import type { FieldRead, ResponseDetail } from "@/types/api";

const PAGE_SIZE = 20;

function formatSubmittedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

type Props = {
  formId: string;
};

export function ResponsesPage({ formId }: Props) {
  const [page, setPage] = useState(0);
  const offset = page * PAGE_SIZE;

  const formQuery = useQuery({
    queryKey: ["forms", formId],
    queryFn: () => getForm(formId),
  });

  const responsesQuery = useQuery({
    queryKey: ["forms", formId, "responses", offset],
    queryFn: () =>
      listFormResponses(formId, { limit: PAGE_SIZE, offset }),
  });

  const orderedFields: FieldRead[] = useMemo(
    () =>
      formQuery.data ? sortFieldsByOrder(formQuery.data.fields) : [],
    [formQuery.data]
  );

  const loadError =
    formQuery.isError || responsesQuery.isError
      ? getErrorMessage(
          formQuery.error ?? responsesQuery.error,
          "Could not load responses."
        )
      : null;

  const isLoading = formQuery.isLoading || responsesQuery.isLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center text-muted-foreground">
        Loading responses…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <ErrorAlert message={loadError} />
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-primary underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!formQuery.data || !responsesQuery.data) return null;

  const { total, responses } = responsesQuery.data;
  const form = formQuery.data;
  const start = total === 0 ? 0 : offset + 1;
  const end = offset + responses.length;
  const hasPrev = page > 0;
  const hasNext = offset + responses.length < total;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/dashboard/builder/${formId}`}
          className="hover:text-foreground"
        >
          {form.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Responses</span>
      </nav>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Responses</h1>
          <p className="mt-1 text-sm text-muted-foreground">{form.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/builder/${formId}`}
            className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            Edit form
          </Link>
          <Link
            href={`/f/${formId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            Open public form
          </Link>
        </div>
      </header>

      <p className="mb-4 text-sm text-muted-foreground">
        {total === 0
          ? "No responses yet."
          : `Showing ${start}–${end} of ${total}`}
      </p>

      {total > 0 && (
        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      <ul className="space-y-4">
        {responses.map((row) => (
          <ResponseCard
            key={row.id}
            row={row}
            fields={orderedFields}
          />
        ))}
      </ul>
    </div>
  );
}

function ResponseCard({
  row,
  fields,
}: {
  row: ResponseDetail;
  fields: FieldRead[];
}) {
  const byId = new Map(row.answers.map((a) => [a.field_id, a]));

  return (
    <li className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <time
        className="text-sm font-medium text-muted-foreground"
        dateTime={row.submitted_at}
      >
        {formatSubmittedAt(row.submitted_at)}
      </time>
      <dl className="mt-4 space-y-3">
        {fields.map((field) => {
          const ans = byId.get(field.id);
          const text = formatAnswerForDisplay(ans?.value ?? null, field);
          return (
            <div key={field.id}>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {field.label}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
                {text}
              </dd>
            </div>
          );
        })}
      </dl>
    </li>
  );
}
