import { ResponsesPage } from "@/components/responses/responses-page";

export default async function FormResponsesRoutePage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  return <ResponsesPage formId={formId} />;
}
