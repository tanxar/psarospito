export const USER_ROLES = ["SEEKER", "BROKER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  brokerOnboardingCompleted: boolean;
};

export function isUserRole(v: unknown): v is UserRole {
  return v === "SEEKER" || v === "BROKER";
}

export function parseSessionUser(raw: unknown): SessionUser | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.email !== "string" || typeof o.name !== "string") return null;
  if (!isUserRole(o.role)) return null;
  if (typeof o.brokerOnboardingCompleted !== "boolean") return null;
  return {
    id: o.id,
    email: o.email,
    name: o.name,
    role: o.role,
    brokerOnboardingCompleted: o.brokerOnboardingCompleted,
  };
}
