import type { SessionUser } from "@/lib/user-session-types";

/** Where to send the user right after login or register (open redirect already sanitized). */
export function resolvePostAuthRedirect(user: SessionUser, requestedNext: string): string {
  if (user.role === "BROKER" && !user.brokerOnboardingCompleted) {
    return "/account/broker-onboarding";
  }
  if (requestedNext && requestedNext !== "/") {
    return requestedNext;
  }
  return user.role === "BROKER" ? "/account" : "/";
}
