import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (request: NextRequest, context: RouteContext) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a Route Handler so it 401s JSON (rather than redirecting, which is
 * what the edge middleware does for page routes) when there's no session.
 * Used by every /api/admin/* endpoint consumed by the Refine data provider.
 */
export function withAdminAuth(handler: Handler): Handler {
  return async (request, context) => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return handler(request, context);
  };
}
