import { cn } from "@/lib/utils";

type Props = {
  message: string | null | undefined;
  className?: string;
};

/** Inline destructive alert for API and validation errors. */
export function ErrorAlert({ message, className }: Props) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        "rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive",
        className
      )}
    >
      {message}
    </p>
  );
}
