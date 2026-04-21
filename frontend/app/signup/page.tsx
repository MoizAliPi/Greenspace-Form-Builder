import { Suspense } from "react";

import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
