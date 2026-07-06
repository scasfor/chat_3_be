import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * Edge proxy (formerly "middleware"): only guards the /admin/* page routes
 * (redirects to /admin/login when unauthenticated). The /api/admin/* routes
 * are protected individually via `withAdminAuth` (see lib/apiAuth.ts) since
 * that needs the full Node.js runtime auth config (Prisma + bcrypt), which
 * cannot run on the Edge runtime this proxy uses.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*"],
};
