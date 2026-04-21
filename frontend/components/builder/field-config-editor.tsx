"use client";

import type { FieldRead } from "@/types/api";
import { ADDRESS_FIELD_PARTS } from "@/lib/builder/form-model";
import { cn } from "@/lib/utils";

type Props = {
  field: FieldRead;
  onChange: (next: FieldRead) => void;
};

export function FieldConfigEditor({ field, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor={`field-label-${field.id}`}
          className="block text-sm font-medium text-foreground"
        >
          Label
        </label>
        <input
          id={`field-label-${field.id}`}
          type="text"
          value={field.label}
          onChange={(e) =>
            onChange({ ...field, label: e.target.value } as FieldRead)
          }
          className={cn(
            "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) =>
            onChange({ ...field, required: e.target.checked } as FieldRead)
          }
          className="rounded border-input"
        />
        Required
      </label>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Field type: {field.type.replace(/_/g, " ")}
        </p>
        <TypeSpecificConfig field={field} onChange={onChange} />
      </div>
    </div>
  );
}

function TypeSpecificConfig({ field, onChange }: Props) {
  switch (field.type) {
    case "short_text":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Placeholder</label>
            <input
              type="text"
              value={field.config.placeholder ?? ""}
              onChange={(e) =>
                onChange({
                  ...field,
                  config: {
                    ...field.config,
                    placeholder: e.target.value || null,
                  },
                })
              }
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Max length</label>
            <input
              type="number"
              min={1}
              max={100}
              value={field.config.max_length ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...field,
                  config: {
                    ...field.config,
                    max_length: v === "" ? null : Number.parseInt(v, 10),
                  },
                });
              }}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      );
    case "long_text":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Placeholder</label>
            <input
              type="text"
              value={field.config.placeholder ?? ""}
              onChange={(e) =>
                onChange({
                  ...field,
                  config: {
                    ...field.config,
                    placeholder: e.target.value || null,
                  },
                })
              }
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Rows</label>
            <input
              type="number"
              min={1}
              max={5}
              value={field.config.rows ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...field,
                  config: {
                    ...field.config,
                    rows: v === "" ? null : Number.parseInt(v, 10),
                  },
                });
              }}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Max length</label>
            <input
              type="number"
              min={1}
              max={500}
              value={field.config.max_length ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...field,
                  config: {
                    ...field.config,
                    max_length: v === "" ? null : Number.parseInt(v, 10),
                  },
                });
              }}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      );
    case "email":
    case "phone_number":
      return (
        <div>
          <label className="text-sm text-muted-foreground">Placeholder</label>
          <input
            type="text"
            value={field.config.placeholder ?? ""}
            onChange={(e) =>
              onChange({
                ...field,
                config: {
                  ...field.config,
                  placeholder: e.target.value || null,
                },
              })
            }
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      );
    case "checkbox":
      return (
        <div>
          <label className="text-sm text-muted-foreground">Checkbox label</label>
          <input
            type="text"
            value={field.config.checkbox_label ?? ""}
            onChange={(e) =>
              onChange({
                ...field,
                config: {
                  ...field.config,
                  checkbox_label: e.target.value || null,
                },
              })
            }
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      );
    case "yes_no": {
      const opts = field.config.options ?? ["yes", "no"];
      const a = opts[0] ?? "yes";
      const b = opts[1] ?? "no";
      return (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">First option</label>
            <input
              type="text"
              value={a}
              onChange={(e) =>
                onChange({
                  ...field,
                  config: {
                    ...field.config,
                    options: [e.target.value, b],
                  },
                })
              }
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Second option</label>
            <input
              type="text"
              value={b}
              onChange={(e) =>
                onChange({
                  ...field,
                  config: {
                    ...field.config,
                    options: [a, e.target.value],
                  },
                })
              }
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      );
    }
    case "address": {
      const selected = new Set(field.config.fields ?? []);
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Include lines</p>
          <div className="flex flex-col gap-2">
            {ADDRESS_FIELD_PARTS.map((part) => (
              <label key={part} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(part)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(part);
                    else next.delete(part);
                    if (next.size === 0) next.add("line1");
                    onChange({
                      ...field,
                      config: { ...field.config, fields: Array.from(next) },
                    });
                  }}
                  className="rounded border-input"
                />
                {part.replace(/_/g, " ")}
              </label>
            ))}
          </div>
        </div>
      );
    }
    case "date_of_birth":
      return (
        <div>
          <label className="text-sm text-muted-foreground">Placeholder hint</label>
          <input
            type="text"
            value={field.config.placeholder ?? ""}
            onChange={(e) =>
              onChange({
                ...field,
                config: {
                  ...field.config,
                  placeholder: e.target.value || null,
                },
              })
            }
            placeholder="e.g. 15-04-1990"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Format is fixed to DD-MM-YYYY.
          </p>
        </div>
      );
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}
