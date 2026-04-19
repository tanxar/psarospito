export const USER_ROLES = ["SEEKER", "BROKER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  brokerOnboardingCompleted: boolean;
  brokerCompanyName?: string | null;
  brokerPhone?: string | null;
  brokerServiceRegions?: string[];
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

  let brokerServiceRegions: string[] | undefined;
  if (Array.isArray(o.brokerServiceRegions)) {
    brokerServiceRegions = o.brokerServiceRegions.filter((x): x is string => typeof x === "string");
  }

  const out: SessionUser = {
    id: o.id,
    email: o.email,
    name: o.name,
    role: o.role,
    brokerOnboardingCompleted: o.brokerOnboardingCompleted,
  };
  if (typeof o.brokerCompanyName === "string") out.brokerCompanyName = o.brokerCompanyName;
  else if (o.brokerCompanyName === null) out.brokerCompanyName = null;
  if (typeof o.brokerPhone === "string") out.brokerPhone = o.brokerPhone;
  else if (o.brokerPhone === null) out.brokerPhone = null;
  if (brokerServiceRegions !== undefined) out.brokerServiceRegions = brokerServiceRegions;
  return out;
}
