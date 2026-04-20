// Shared API types — mirrors the Pydantic schemas in backend/app/schemas/
// Will be populated in Todo 3.

export type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone_number"
  | "checkbox"
  | "yes_no"
  | "address"
  | "date_of_birth";
