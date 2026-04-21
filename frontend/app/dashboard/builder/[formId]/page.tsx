import { FormBuilder } from "@/components/builder/form-builder";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  return <FormBuilder formId={formId} />;
}
