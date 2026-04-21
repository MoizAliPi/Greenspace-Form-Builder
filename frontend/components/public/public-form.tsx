"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PublicFieldInput } from "@/components/public/public-field-input";
import { ApiError } from "@/lib/api";
import { sortFieldsByOrder } from "@/lib/builder/form-model";
import { buildSubmitAnswers } from "@/lib/public-form/answers";
import { validateFieldValue } from "@/lib/public-form/validate";
import { getFormForViewer, submitForm } from "@/lib/forms-api";
import type { FieldRead } from "@/types/api";

function initialValuesForFields(fields: FieldRead[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const f of sortFieldsByOrder(fields)) {
    switch (f.type) {
      case "checkbox":
        o[f.id] = false;
        break;
      case "yes_no":
        o[f.id] = "";
        break;
      case "address": {
        const addr: Record<string, string> = {};
        for (const k of f.config.fields ?? []) addr[k] = "";
        o[f.id] = addr;
        break;
      }
      default:
        o[f.id] = "";
    }
  }
  return o;
}

type Props = {
  formId: string;
};

export function PublicForm({ formId }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const formQuery = useQuery({
    queryKey: ["forms", "public", formId],
    queryFn: () => getFormForViewer(formId),
    retry: false,
  });

  const fields = useMemo(
    () => (formQuery.data ? sortFieldsByOrder(formQuery.data.fields) : []),
    [formQuery.data]
  );

  useEffect(() => {
    if (!formQuery.data) return;
    setValues(initialValuesForFields(formQuery.data.fields));
  }, [formQuery.data?.id]);

  const setFieldValue = useCallback((fieldId: string, next: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: next }));
    setFieldErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const { [fieldId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const validateAll = useCallback((): boolean => {
    const next: Record<string, string> = {};
    for (const field of fields) {
      const msg = validateFieldValue(field, values[field.id]);
      if (msg) next[field.id] = msg;
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }, [fields, values]);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitForm(formId, {
        answers: buildSubmitAnswers(fields, values),
      }),
    onSuccess: () => {
      setSubmitted(true);
      setSubmitError(null);
    },
    onError: (e) => {
      setSubmitError(
        e instanceof ApiError ? e.message : "Something went wrong. Try again."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateAll()) return;
    submitMutation.mutate();
  };

  if (formQuery.isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-muted-foreground">
        Loading form…
      </div>
    );
  }

  if (formQuery.isError) {
    const err = formQuery.error;
    const msg =
      err instanceof ApiError && err.message
        ? err.message
        : "This form could not be loaded.";
    const hint =
      err instanceof ApiError && err.status === 404
        ? "For visitors, the form must be published. The URL must use the form ID from the builder (UUID), not the slug."
        : "It may be unpublished or the link may be incorrect.";
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-destructive">{msg}</p>
        <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
      </div>
    );
  }

  if (!formQuery.data) return null;

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">Thank you</h1>
        <p className="mt-2 text-muted-foreground">
          Your response has been recorded.
        </p>
      </div>
    );
  }

  const form = formQuery.data;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{form.title}</h1>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This form has no fields yet.
          </p>
        ) : (
          fields.map((field) => (
            <PublicFieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(next) => setFieldValue(field.id, next)}
              error={fieldErrors[field.id]}
            />
          ))
        )}

        {submitError && (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitMutation.isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitMutation.isPending ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
