import { type NextRequest, NextResponse } from "next/server";

// JWT lives in localStorage; route protection is handled client-side (see AuthGuard).
// Optional: mirror the token into an httpOnly cookie if Edge middleware should enforce auth.
export function middleware(_request: NextRequest): NextResponse {
  return NextResponse.next();
}
