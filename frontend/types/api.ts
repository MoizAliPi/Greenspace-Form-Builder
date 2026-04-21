/**
 * Wire types — mirrors `backend/app/schemas/`. JSON uses snake_case; UUIDs and datetimes are strings.
 */

export type FormStatus = "draft" | "published";

export type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone_number"
  | "checkbox"
  | "yes_no"
  | "address"
  | "date_of_birth";

/** JSON-serializable answer payload (submitted values vary by field type). */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

// --- Field config (stored in `fields.config`) ---

export type ShortTextConfig = {
  placeholder?: string | null;
  max_length?: number | null;
};

export type LongTextConfig = {
  placeholder?: string | null;
  rows?: number | null;
  max_length?: number | null;
};

export type EmailConfig = {
  placeholder?: string | null;
};

export type PhoneNumberConfig = {
  placeholder?: string | null;
};

export type CheckboxConfig = {
  checkbox_label?: string | null;
};

export type YesNoConfig = {
  options?: string[];
};

export type AddressConfig = {
  fields?: string[];
};

export type DateOfBirthConfig = {
  /** Collect DOB as day-month-year. */
  date_format?: "DD-MM-YYYY";
  /** Optional hint (e.g. 15-04-1990). */
  placeholder?: string | null;
};

// --- Field create (discriminated by `type`) ---

export type ShortTextFieldCreate = {
  type: "short_text";
  id?: string | null;
  label: string;
  required: boolean;
  order: number;
  config: ShortTextConfig;
};

export type LongTextFieldCreate = {
  type: "long_text";
  id?: string | null;
  label: string;
  required: boolean;
  order: number;
  config: LongTextConfig;
};

export type EmailFieldCreate = {
  type: "email";
  id?: string | null;
  label: string;
  required: boolean;
  order: number;
  config: EmailConfig;
};

export type PhoneNumberFieldCreate = {
  type: "phone_number";
  id?: string | null;
  label: string;
  required: boolean;
  order: number;
  config: PhoneNumberConfig;
};

export type CheckboxFieldCreate = {
  type: "checkbox";
  id?: string | null;
  label: string;
  required: boolean;
  order: number;
  config: CheckboxConfig;
};

export type YesNoFieldCreate = {
  type: "yes_no";
  id?: string | null;
  label: string;
  required: boolean;
  order: number;
  config: YesNoConfig;
};

export type AddressFieldCreate = {
  type: "address";
  id?: string | null;
  label: string;
  required: boolean;
  order: number;
  config: AddressConfig;
};

export type DateOfBirthFieldCreate = {
  type: "date_of_birth";
  id?: string | null;
  label: string;
  required: boolean;
  order: number;
  config: DateOfBirthConfig;
};

export type FieldCreate =
  | ShortTextFieldCreate
  | LongTextFieldCreate
  | EmailFieldCreate
  | PhoneNumberFieldCreate
  | CheckboxFieldCreate
  | YesNoFieldCreate
  | AddressFieldCreate
  | DateOfBirthFieldCreate;

// --- Field read ---

export type ShortTextFieldRead = {
  id: string;
  form_id: string;
  type: "short_text";
  label: string;
  required: boolean;
  order: number;
  config: ShortTextConfig;
  created_at: string;
};

export type LongTextFieldRead = {
  id: string;
  form_id: string;
  type: "long_text";
  label: string;
  required: boolean;
  order: number;
  config: LongTextConfig;
  created_at: string;
};

export type EmailFieldRead = {
  id: string;
  form_id: string;
  type: "email";
  label: string;
  required: boolean;
  order: number;
  config: EmailConfig;
  created_at: string;
};

export type PhoneNumberFieldRead = {
  id: string;
  form_id: string;
  type: "phone_number";
  label: string;
  required: boolean;
  order: number;
  config: PhoneNumberConfig;
  created_at: string;
};

export type CheckboxFieldRead = {
  id: string;
  form_id: string;
  type: "checkbox";
  label: string;
  required: boolean;
  order: number;
  config: CheckboxConfig;
  created_at: string;
};

export type YesNoFieldRead = {
  id: string;
  form_id: string;
  type: "yes_no";
  label: string;
  required: boolean;
  order: number;
  config: YesNoConfig;
  created_at: string;
};

export type AddressFieldRead = {
  id: string;
  form_id: string;
  type: "address";
  label: string;
  required: boolean;
  order: number;
  config: AddressConfig;
  created_at: string;
};

export type DateOfBirthFieldRead = {
  id: string;
  form_id: string;
  type: "date_of_birth";
  label: string;
  required: boolean;
  order: number;
  config: DateOfBirthConfig;
  created_at: string;
};

export type FieldRead =
  | ShortTextFieldRead
  | LongTextFieldRead
  | EmailFieldRead
  | PhoneNumberFieldRead
  | CheckboxFieldRead
  | YesNoFieldRead
  | AddressFieldRead
  | DateOfBirthFieldRead;

// --- Forms ---

export type FormCreate = {
  title: string;
  slug?: string | null;
};

export type FormUpdate = {
  title?: string | null;
  slug?: string | null;
  status?: FormStatus | null;
  fields?: FieldCreate[] | null;
};

export type FormRead = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: FormStatus;
  created_at: string;
  updated_at: string;
  fields: FieldRead[];
};

// --- Submissions & responses ---

export type AnswerSubmit = {
  field_id: string;
  value: JsonValue;
};

export type FormSubmit = {
  answers: AnswerSubmit[];
};

export type ResponseRead = {
  id: string;
  form_id: string;
  submitted_at: string;
};

export type AnswerRead = {
  field_id: string;
  field_label: string;
  value: JsonValue;
};

export type ResponseDetail = {
  id: string;
  submitted_at: string;
  answers: AnswerRead[];
};

export type ResponsesRead = {
  form_id: string;
  total: number;
  responses: ResponseDetail[];
};

export type PaginationParams = {
  limit: number;
  offset: number;
};
