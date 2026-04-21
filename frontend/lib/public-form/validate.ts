import type { FieldRead } from "@/types/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidDdMmYyyy(s: string): boolean {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(s)) return false;
  const parts = s.split("-");
  const dd = Number.parseInt(parts[0] ?? "", 10);
  const mm = Number.parseInt(parts[1] ?? "", 10);
  const yyyy = Number.parseInt(parts[2] ?? "", 10);
  if (
    !Number.isFinite(dd) ||
    !Number.isFinite(mm) ||
    !Number.isFinite(yyyy)
  ) {
    return false;
  }
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  const dt = new Date(yyyy, mm - 1, dd);
  return (
    dt.getFullYear() === yyyy &&
    dt.getMonth() === mm - 1 &&
    dt.getDate() === dd
  );
}

/** Returns a field-level error message, or null if valid. */
export function validateFieldValue(
  field: FieldRead,
  raw: unknown
): string | null {
  switch (field.type) {
    case "short_text":
    case "long_text": {
      const s = typeof raw === "string" ? raw : "";
      if (field.required && !s.trim()) return "This field is required";
      return null;
    }
    case "email": {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (field.required && !s) return "This field is required";
      if (s && !EMAIL_RE.test(s)) return "Enter a valid email address";
      return null;
    }
    case "phone_number": {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (field.required && !s) return "This field is required";
      return null;
    }
    case "checkbox": {
      if (typeof raw !== "boolean" && raw !== undefined) return "Invalid value";
      return null;
    }
    case "yes_no": {
      const v = raw === "yes" || raw === "no" ? raw : "";
      if (field.required && v === "") return "Select an option";
      return null;
    }
    case "address": {
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return "Invalid address";
      }
      const obj = raw as Record<string, unknown>;
      const parts = field.config.fields ?? [];
      const trimmed = parts.map((key) =>
        typeof obj[key] === "string" ? (obj[key] as string).trim() : ""
      );
      const anyFilled = trimmed.some((v) => v.length > 0);
      if (!anyFilled) {
        if (field.required) return "This field is required";
        return null;
      }
      for (let i = 0; i < parts.length; i++) {
        if (!trimmed[i]) return "Fill in all address lines";
      }
      return null;
    }
    case "date_of_birth": {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (field.required && !s) return "This field is required";
      if (s && !isValidDdMmYyyy(s)) {
        return "Use DD-MM-YYYY (e.g. 15-04-1990)";
      }
      return null;
    }
  }
}
