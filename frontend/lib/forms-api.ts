import { apiFetch } from "@/lib/api";
import type {
  FormCreate,
  FormRead,
  FormsListRead,
  FormSubmit,
  FormUpdate,
  ResponseRead,
  ResponsesRead,
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

/**
 * Load a form for the **builder**. Always sends `Authorization`; the backend returns 404
 * for non-owners so a missing/expired token surfaces immediately as a builder error.
 */
export async function getForm(formId: string): Promise<FormRead> {
  return apiFetch<FormRead>(`/forms/${formId}`);
}

/**
 * Load a form for **viewing** (public `/f/[id]` page and draft previews). Sends the JWT if
 * present so the owner can preview a draft; anonymous requests only receive published forms
 * (ACL enforced in `backend/app/services/forms_service.py::get_form`). Kept separate from
 * `getForm` so intent is obvious at the call site even though the URL is identical today.
 */
export async function getFormForViewer(formId: string): Promise<FormRead> {
  return apiFetch<FormRead>(`/forms/${formId}`);
}

export async function submitForm(
  formId: string,
  body: FormSubmit
): Promise<ResponseRead> {
  return apiFetch<ResponseRead>(`/forms/${formId}/submit`, {
    method: "POST",
    body,
    skipAuth: true,
  });
}

export async function updateForm(
  formId: string,
  body: FormUpdate
): Promise<FormRead> {
  return apiFetch<FormRead>(`/forms/${formId}`, { method: "PUT", body });
}

export async function listFormResponses(
  formId: string,
  params?: { limit?: number; offset?: number }
): Promise<ResponsesRead> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));
  const q = sp.toString();
  return apiFetch<ResponsesRead>(
    `/forms/${formId}/responses${q ? `?${q}` : ""}`
  );
}
