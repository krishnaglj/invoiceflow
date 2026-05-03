import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
});

export const { useSession, signIn, signOut, signUp } = authClient;

export async function requestPasswordReset(email: string, redirectTo: string) {
  const res = await fetch(`${window.location.origin}/api/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirectTo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: { message: data?.message ?? "Request failed" } };
  return { data };
}

export async function resetPassword(token: string, newPassword: string) {
  const res = await fetch(`${window.location.origin}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: { message: data?.message ?? "Reset failed" } };
  return { data };
}
