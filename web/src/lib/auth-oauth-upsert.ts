import { UserRole } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { isValidEmail, normalizeEmail, validateDisplayName } from "@/lib/auth-validation";

export type OAuthProviderId = "google" | "facebook";

export type OAuthProfileInput = {
  provider: OAuthProviderId;
  providerAccountId: string;
  email: string;
  name: string;
};

function safeDisplayName(raw: string, email: string): string {
  const t = raw.trim();
  const fallback = email.split("@")[0] ?? "Χρήστης";
  const candidate = t.length >= 2 ? t : fallback;
  const err = validateDisplayName(candidate);
  if (!err) return candidate;
  if (candidate.length > 80) return candidate.slice(0, 80).trim() || fallback.slice(0, 80);
  return fallback.slice(0, 80);
}

/** Find or create user and link OAuth account. New users are SEEKER. */
export async function upsertUserFromOAuth(profile: OAuthProfileInput) {
  const email = normalizeEmail(profile.email);
  if (!isValidEmail(email)) {
    throw new Error("Μη έγκυρο email από τον πάροχο σύνδεσης");
  }

  const name = safeDisplayName(profile.name, email);

  const linked = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          brokerOnboardingCompleted: true,
        },
      },
    },
  });

  if (linked) {
    return linked.user;
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    await prisma.oAuthAccount.create({
      data: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        userId: existingEmail.id,
      },
    });
    return {
      id: existingEmail.id,
      email: existingEmail.email,
      name: existingEmail.name,
      role: existingEmail.role as "SEEKER" | "BROKER",
      brokerOnboardingCompleted: existingEmail.brokerOnboardingCompleted,
    };
  }

  const created = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: null,
      role: UserRole.SEEKER,
      oauthAccounts: {
        create: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      brokerOnboardingCompleted: true,
    },
  });

  return {
    ...created,
    role: created.role as "SEEKER" | "BROKER",
  };
}
