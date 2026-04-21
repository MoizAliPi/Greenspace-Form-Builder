import type { FieldRead, JsonValue } from "@/types/api";

function jsonFallback(value: JsonValue): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 0);
  } catch {
    return String(value);
  }
}

/**
 * Renders a stored answer for display on the responses dashboard,
 * using field type when available for address / yes-no / checkbox labels.
 */
export function formatAnswerForDisplay(
  value: JsonValue | null | undefined,
  field: FieldRead | undefined
): string {
  if (value === null || value === undefined) return "—";
  if (!field) return jsonFallback(value);

  switch (field.type) {
    case "checkbox":
      return typeof value === "boolean" ? (value ? "Yes" : "No") : jsonFallback(value);
    case "yes_no": {
      if (value !== "yes" && value !== "no") return jsonFallback(value);
      const opts = field.config.options ?? ["yes", "no"];
      return value === "yes" ? (opts[0] ?? "Yes") : (opts[1] ?? "No");
    }
    case "address": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return jsonFallback(value);
      }
      const o = value as Record<string, JsonValue>;
      const keys = field.config.fields?.length
        ? field.config.fields
        : Object.keys(o);
      const lines = keys
        .map((k) => {
          const raw = o[k];
          const s =
            typeof raw === "string"
              ? raw
              : raw === null || raw === undefined
                ? ""
                : jsonFallback(raw);
          const label = k.replace(/_/g, " ");
          return s.trim() ? `${label}: ${s}` : null;
        })
        .filter((line): line is string => line != null);
      return lines.length > 0 ? lines.join("\n") : "—";
    }
    case "date_of_birth":
      return typeof value === "string" ? value : jsonFallback(value);
    case "short_text":
    case "long_text":
    case "email":
    case "phone_number":
      return typeof value === "string" ? value : jsonFallback(value);
  }
}
