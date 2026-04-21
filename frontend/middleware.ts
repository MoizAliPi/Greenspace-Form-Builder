import { type NextRequest, NextResponse } from "next/server";

// Auth middleware will be fully wired in Todo 5 (Supabase Auth).
export function middleware(_request: NextRequest): NextResponse {
  return NextResponse.next();
}
