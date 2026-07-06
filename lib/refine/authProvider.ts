"use client";

import type { AuthProvider } from "@refinedev/core";
import { getSession, signIn, signOut } from "next-auth/react";

/**
 * Bridges Refine's AuthProvider contract to NextAuth (Auth.js) Credentials
 * sign-in. Page-level protection for /admin/* is already enforced by the
 * edge middleware (see middleware.ts); this provider drives Refine's UI
 * state (login form, user menu, logout) and the /api/admin/* 401 handling.
 */
export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: "Invalid email or password.",
        },
      };
    }

    return { success: true, redirectTo: "/admin" };
  },
  logout: async () => {
    await signOut({ redirect: false });
    return { success: true, redirectTo: "/admin/login" };
  },
  check: async () => {
    const session = await getSession();
    if (session) {
      return { authenticated: true };
    }
    return { authenticated: false, redirectTo: "/admin/login", logout: true };
  },
  onError: async (error) => {
    if (error?.statusCode === 401) {
      return { logout: true, redirectTo: "/admin/login" };
    }
    return { error };
  },
  getIdentity: async () => {
    const session = await getSession();
    if (!session?.user) {
      return null;
    }
    return {
      id: session.user.id,
      name: session.user.name ?? session.user.email,
      email: session.user.email,
    };
  },
};
