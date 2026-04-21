import type { FieldRead, JsonValue } from "@/types/api";

import { sortFieldsByOrder } from "@/lib/builder/form-model";

/** Build payload answers; omits optional empty values where allowed. */
export function buildSubmitAnswers(
  fields: FieldRead[],
  values: Record<string, unknown>
): { field_id: string; value: JsonValue }[] {
  const ordered = sortFieldsByOrder(fields);
  const out: { field_id: string; value: JsonValue }[] = [];

  for (const field of ordered) {
    const raw = values[field.id];
    const v = toSubmitValue(field, raw);
    if (v === undefined) continue;
    out.push({ field_id: field.id, value: v });
  }

  return out;
}

function toSubmitValue(
  field: FieldRead,
  raw: unknown
): JsonValue | undefined {
  switch (field.type) {
    case "short_text":
    case "long_text": {
      const s = typeof raw === "string" ? raw : "";
      if (!field.required && !s.trim()) return undefined;
      return s;
    }
    case "email": {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!field.required && !s) return undefined;
      return s;
    }
    case "phone_number": {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!field.required && !s) return undefined;
      return s;
    }
    case "checkbox": {
      const b = typeof raw === "boolean" ? raw : false;
      if (!field.required && !b) return undefined;
      return b;
    }
    case "yes_no": {
      const v = raw === "yes" || raw === "no" ? raw : "";
      if (v === "") return undefined;
      return v;
    }
    case "address": {
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return undefined;
      }
      const obj = raw as Record<string, string>;
      const keys = field.config.fields ?? [];
      const out: Record<string, string> = {};
      let any = false;
      for (const k of keys) {
        const val = typeof obj[k] === "string" ? obj[k] : "";
        if (val.trim()) any = true;
        out[k] = val;
      }
      if (!field.required && !any) return undefined;
      return out;
    }
    case "date_of_birth": {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!field.required && !s) return undefined;
      return s;
    }
  }
}
