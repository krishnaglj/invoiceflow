import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
});

export const { useSession, signIn, signOut, signUp } = authClient;
export const { forgetPassword, resetPassword } = authClient;
