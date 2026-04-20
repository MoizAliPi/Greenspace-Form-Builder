import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:8000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// This runs at build time for server bundles and at runtime for client bundles.
// Missing required env vars will throw immediately rather than silently misbehave.
export const env = schema.parse({
  NEXT_PUBLIC_API_URL: process.env["NEXT_PUBLIC_API_URL"],
  NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
});
