"use client";

import type { FieldRead } from "@/types/api";
import { cn } from "@/lib/utils";

const inputClass = cn(
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
);

type Props = {
  field: FieldRead;
  value: unknown;
  onChange: (next: unknown) => void;
  error?: string | null;
};

export function PublicFieldInput({ field, value, onChange, error }: Props) {
  const errId = `err-${field.id}`;
  const label = (
    <label
      htmlFor={`field-${field.id}`}
      className="block text-sm font-medium text-foreground"
    >
      {field.label}
      {field.required ? (
        <span className="text-destructive" aria-hidden>
          {" "}
          *
        </span>
      ) : null}
    </label>
  );

  const hint = error ? (
    <p id={errId} className="mt-1 text-sm text-destructive" role="alert">
      {error}
    </p>
  ) : null;

  switch (field.type) {
    case "short_text":
      return (
        <div>
          {label}
          <input
            id={`field-${field.id}`}
            type="text"
            className={inputClass}
            placeholder={field.config.placeholder ?? undefined}
            maxLength={field.config.max_length ?? undefined}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
          />
          {hint}
        </div>
      );
    case "long_text":
      return (
        <div>
          {label}
          <textarea
            id={`field-${field.id}`}
            className={cn(inputClass, "min-h-[100px] resize-y")}
            placeholder={field.config.placeholder ?? undefined}
            maxLength={field.config.max_length ?? undefined}
            rows={field.config.rows ?? 4}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
          />
          {hint}
        </div>
      );
    case "email":
      return (
        <div>
          {label}
          <input
            id={`field-${field.id}`}
            type="email"
            autoComplete="email"
            className={inputClass}
            placeholder={field.config.placeholder ?? undefined}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
          />
          {hint}
        </div>
      );
    case "phone_number":
      return (
        <div>
          {label}
          <input
            id={`field-${field.id}`}
            type="tel"
            autoComplete="tel"
            className={inputClass}
            placeholder={field.config.placeholder ?? undefined}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
          />
          {hint}
        </div>
      );
    case "checkbox": {
      const checked = typeof value === "boolean" ? value : false;
      const boxLabel = field.config.checkbox_label ?? field.label;
      return (
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              id={`field-${field.id}`}
              type="checkbox"
              className="mt-1 rounded border-input"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              aria-invalid={!!error}
              aria-describedby={error ? errId : undefined}
            />
            <span>
              {boxLabel}
              {field.required ? (
                <span className="text-destructive" aria-hidden>
                  {" "}
                  *
                </span>
              ) : null}
            </span>
          </label>
          {hint}
        </div>
      );
    }
    case "yes_no": {
      const v = value === "yes" || value === "no" ? value : "";
      const opts = field.config.options ?? ["yes", "no"];
      const a = opts[0] ?? "Yes";
      const b = opts[1] ?? "No";
      const name = `yesno-${field.id}`;
      return (
        <fieldset>
          <legend className="text-sm font-medium text-foreground">
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </legend>
          <div className="mt-2 flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={name}
                value="yes"
                checked={v === "yes"}
                onChange={() => onChange("yes")}
              />
              {a}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={name}
                value="no"
                checked={v === "no"}
                onChange={() => onChange("no")}
              />
              {b}
            </label>
          </div>
          {hint}
        </fieldset>
      );
    }
    case "address": {
      const obj =
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
          ? (value as Record<string, string>)
          : {};
      const keys = field.config.fields ?? [];
      return (
        <fieldset>
          <legend className="text-sm font-medium text-foreground">
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </legend>
          <div className="mt-2 space-y-3">
            {keys.map((key) => (
              <div key={key}>
                <label
                  htmlFor={`field-${field.id}-${key}`}
                  className="text-xs text-muted-foreground"
                >
                  {key.replace(/_/g, " ")}
                </label>
                <input
                  id={`field-${field.id}-${key}`}
                  type="text"
                  className={inputClass}
                  value={typeof obj[key] === "string" ? obj[key] : ""}
                  onChange={(e) =>
                    onChange({
                      ...obj,
                      [key]: e.target.value,
                    })
                  }
                />
              </div>
            ))}
          </div>
          {hint}
        </fieldset>
      );
    }
    case "date_of_birth":
      return (
        <div>
          {label}
          <input
            id={`field-${field.id}`}
            type="text"
            inputMode="numeric"
            className={inputClass}
            placeholder={field.config.placeholder ?? "DD-MM-YYYY"}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
          />
          <p className="mt-1 text-xs text-muted-foreground">Format: DD-MM-YYYY</p>
          {hint}
        </div>
      );
  }
}
