import * as jose from "jose";

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET?.trim();
  if (s && s.length >= 32) {
    return new TextEncoder().encode(s);
  }
  if (process.env.NODE_ENV === "development") {
    return new TextEncoder().encode("dev-nestio-auth-secret-min-32-chars!!");
  }
  throw new Error("AUTH_SECRET is required (min 32 characters) in production");
}

export async function signSessionToken(userId: string): Promise<string> {
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey());
    const sub = payload.sub;
    return typeof sub === "string" && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}

const OAUTH_STATE_CLAIM = "oauth_state" as const;

export async function signOAuthState(next: string, provider: "google" | "facebook"): Promise<string> {
  return new jose.SignJWT({ [OAUTH_STATE_CLAIM]: true, next, provider })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secretKey());
}

export async function verifyOAuthState(
  token: string
): Promise<{ next: string; provider: "google" | "facebook" } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey());
    if (payload[OAUTH_STATE_CLAIM] !== true) return null;
    const next = typeof payload.next === "string" ? payload.next : "";
    const p = payload.provider;
    if (p !== "google" && p !== "facebook") return null;
    return { next, provider: p };
  } catch {
    return null;
  }
}
