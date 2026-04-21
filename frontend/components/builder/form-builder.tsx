"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { FieldConfigEditor } from "@/components/builder/field-config-editor";
import { SortableFieldList } from "@/components/builder/sortable-field-list";
import { ApiError } from "@/lib/api";
import {
  createNewField,
  FIELD_PALETTE,
  fieldsToFieldCreates,
  sortFieldsByOrder,
} from "@/lib/builder/form-model";
import { getForm, updateForm } from "@/lib/forms-api";
import { cn, slugifyTitle } from "@/lib/utils";
import type { FieldRead, FormStatus } from "@/types/api";

type Draft = {
  title: string;
  slug: string;
  status: FormStatus;
  fields: FieldRead[];
};

function formReadToDraft(r: {
  title: string;
  slug: string;
  status: FormStatus;
  fields: FieldRead[];
}): Draft {
  return {
    title: r.title,
    slug: r.slug,
    status: r.status,
    fields: sortFieldsByOrder(r.fields),
  };
}

type Props = {
  formId: string;
};

export function FormBuilder({ formId }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["forms", formId],
    queryFn: () => getForm(formId),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data) {
      setDraft(formReadToDraft(query.data));
      setSelectedId((current) => {
        if (current && query.data.fields.some((f) => f.id === current)) {
          return current;
        }
        return query.data.fields[0]?.id ?? null;
      });
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateForm>[1]) =>
      updateForm(formId, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(["forms", formId], updated);
      queryClient.invalidateQueries({ queryKey: ["forms", "list"] });
      setDraft(formReadToDraft(updated));
      setError(null);
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Could not save form.");
    },
  });

  const replaceField = useCallback((next: FieldRead) => {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        fields: d.fields.map((f) => (f.id === next.id ? next : f)),
      };
    });
  }, []);

  const handleSave = () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      setError("Title is required.");
      return;
    }
    saveMutation.mutate({
      title: draft.title.trim(),
      slug: draft.slug.trim(),
      status: draft.status,
      fields: fieldsToFieldCreates(draft.fields),
    });
  };

  const handleAddField = (type: FieldRead["type"]) => {
    setDraft((d) => {
      if (!d) return d;
      const order = d.fields.length;
      const next = createNewField(formId, type, order);
      setSelectedId(next.id);
      return { ...d, fields: [...d.fields, next] };
    });
  };

  const handleRemoveField = (id: string) => {
    setDraft((d) => {
      if (!d) return d;
      const filtered = d.fields.filter((f) => f.id !== id);
      const reindexed = filtered.map((f, i) => ({ ...f, order: i }));
      setSelectedId((cur) => {
        if (cur === id) return reindexed[0]?.id ?? null;
        return cur;
      });
      return { ...d, fields: reindexed };
    });
  };

  const handleReorder = (nextFields: FieldRead[]) => {
    setDraft((d) => (d ? { ...d, fields: nextFields } : d));
  };

  if (query.isLoading || !draft) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading form…</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
        <p className="text-destructive">
          {query.error instanceof ApiError
            ? query.error.message
            : "Could not load this form."}
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-primary underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const selected = draft.fields.find((f) => f.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Form builder
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setDraft((d) =>
                d
                  ? {
                      ...d,
                      status: d.status === "published" ? "draft" : "published",
                    }
                  : d
              )
            }
            className={cn(
              "rounded-md border px-4 py-2 text-sm font-medium",
              draft.status === "published"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-secondary-foreground"
            )}
          >
            {draft.status === "published" ? "Published" : "Draft"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mb-6 grid gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:grid-cols-2">
        <div>
          <label htmlFor="form-title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="form-title"
            type="text"
            value={draft.title}
            onChange={(e) =>
              setDraft((d) => (d ? { ...d, title: e.target.value } : d))
            }
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="form-slug" className="text-sm font-medium">
            Slug
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="form-slug"
              type="text"
              value={draft.slug}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, slug: e.target.value } : d))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              className="shrink-0 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium"
              onClick={() =>
                setDraft((d) =>
                  d ? { ...d, slug: slugifyTitle(d.title) } : d
                )
              }
            >
              From title
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Lowercase letters, numbers, and hyphens only.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr_300px]">
        <aside className="space-y-2">
          <p className="text-sm font-medium text-foreground">Add fields</p>
          <div className="flex flex-col gap-2">
            {FIELD_PALETTE.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => handleAddField(type)}
                className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent"
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        <section>
          <p className="mb-2 text-sm font-medium text-foreground">Fields</p>
          <SortableFieldList
            fields={draft.fields}
            selectedId={selectedId}
            onReorder={handleReorder}
            onSelect={setSelectedId}
            onRemove={handleRemoveField}
          />
        </section>

        <aside className="rounded-lg border border-border bg-card p-4 shadow-sm">
          {selected ? (
            <>
              <h2 className="text-sm font-semibold text-foreground">
                Edit field
              </h2>
              <div className="mt-4">
                <FieldConfigEditor field={selected} onChange={replaceField} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a field to edit its settings.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
