import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no Prisma / bcrypt imports) used by the middleware
 * for route protection. The full config with the Credentials provider lives
 * in `auth.ts` and only ever runs in the Node.js runtime.
 */
export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/admin/login";
      const isProtected = nextUrl.pathname.startsWith("/admin") && !isLoginPage;

      if (isProtected) {
        return isLoggedIn;
      }

      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/admin", nextUrl));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
