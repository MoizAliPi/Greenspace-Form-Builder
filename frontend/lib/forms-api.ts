import { apiFetch } from "@/lib/api";
import type {
  FormCreate,
  FormRead,
  FormsListRead,
  FormUpdate,
} from "@/types/api";

export async function listMyForms(params?: {
  limit?: number;
  offset?: number;
}): Promise<FormsListRead> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));
  const q = sp.toString();
  return apiFetch<FormsListRead>(`/forms${q ? `?${q}` : ""}`);
}

export async function createForm(body: FormCreate): Promise<FormRead> {
  return apiFetch<FormRead>("/forms", { method: "POST", body });
}

export async function getForm(formId: string): Promise<FormRead> {
  return apiFetch<FormRead>(`/forms/${formId}`);
}

export async function updateForm(
  formId: string,
  body: FormUpdate
): Promise<FormRead> {
  return apiFetch<FormRead>(`/forms/${formId}`, { method: "PUT", body });
}
