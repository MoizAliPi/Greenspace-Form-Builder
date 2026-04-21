import type {
  FieldCreate,
  FieldRead,
  FieldType,
} from "@/types/api";

/** Sub-keys collected for an address field (matches backend default). */
export const ADDRESS_FIELD_PARTS = [
  "line1",
  "line2",
  "city",
  "state",
  "postal_code",
  "country",
] as const;

function defaultLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    short_text: "Short text",
    long_text: "Long text",
    email: "Email",
    phone_number: "Phone number",
    checkbox: "Checkbox",
    yes_no: "Yes / No",
    address: "Address",
    date_of_birth: "Date of birth",
  };
  return labels[type];
}

/** New field for the builder — uses a client-generated id until the next full load. */
export function createNewField(
  formId: string,
  type: FieldType,
  order: number
): FieldRead {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const base = {
    id,
    form_id: formId,
    label: defaultLabel(type),
    required: false,
    order,
    created_at,
  };
  switch (type) {
    case "short_text":
      return { ...base, type: "short_text", config: {} };
    case "long_text":
      return { ...base, type: "long_text", config: {} };
    case "email":
      return { ...base, type: "email", config: {} };
    case "phone_number":
      return { ...base, type: "phone_number", config: {} };
    case "checkbox":
      return { ...base, type: "checkbox", config: {} };
    case "yes_no":
      return {
        ...base,
        type: "yes_no",
        config: { options: ["yes", "no"] },
      };
    case "address":
      return {
        ...base,
        type: "address",
        config: { fields: [...ADDRESS_FIELD_PARTS] },
      };
    case "date_of_birth":
      return {
        ...base,
        type: "date_of_birth",
        config: { date_format: "DD-MM-YYYY", placeholder: null },
      };
  }
}

export function sortFieldsByOrder(fields: FieldRead[]): FieldRead[] {
  return [...fields].sort((a, b) => a.order - b.order);
}

/** Maps persisted fields to `FieldCreate` for `PUT`, preserving ids for stable references. */
export function fieldsToFieldCreates(fields: FieldRead[]): FieldCreate[] {
  const sorted = sortFieldsByOrder(fields);
  return sorted.map((f, index) => {
    const order = index;
    const id = f.id;
    switch (f.type) {
      case "short_text":
        return {
          type: "short_text",
          id,
          label: f.label,
          required: f.required,
          order,
          config: f.config,
        };
      case "long_text":
        return {
          type: "long_text",
          id,
          label: f.label,
          required: f.required,
          order,
          config: f.config,
        };
      case "email":
        return {
          type: "email",
          id,
          label: f.label,
          required: f.required,
          order,
          config: f.config,
        };
      case "phone_number":
        return {
          type: "phone_number",
          id,
          label: f.label,
          required: f.required,
          order,
          config: f.config,
        };
      case "checkbox":
        return {
          type: "checkbox",
          id,
          label: f.label,
          required: f.required,
          order,
          config: f.config,
        };
      case "yes_no":
        return {
          type: "yes_no",
          id,
          label: f.label,
          required: f.required,
          order,
          config: f.config,
        };
      case "address":
        return {
          type: "address",
          id,
          label: f.label,
          required: f.required,
          order,
          config: f.config,
        };
      case "date_of_birth":
        return {
          type: "date_of_birth",
          id,
          label: f.label,
          required: f.required,
          order,
          config: f.config,
        };
    }
  });
}

export const FIELD_PALETTE: { type: FieldType; label: string }[] = [
  { type: "short_text", label: "Short text" },
  { type: "long_text", label: "Long text" },
  { type: "email", label: "Email" },
  { type: "phone_number", label: "Phone" },
  { type: "checkbox", label: "Checkbox" },
  { type: "yes_no", label: "Yes / No" },
  { type: "address", label: "Address" },
  { type: "date_of_birth", label: "Date of birth" },
];
