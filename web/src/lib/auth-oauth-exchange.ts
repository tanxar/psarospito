import type { OAuthProviderId } from "@/lib/auth-oauth-upsert";

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
};

export type FacebookUserInfo = {
  id: string;
  name?: string;
  email?: string;
};

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleUserInfo> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Δεν έχει ρυθμιστεί το Google OAuth (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const tokenJson = (await readJson(tokenRes)) as { access_token?: string; error?: string } | null;
  if (!tokenRes.ok || !tokenJson?.access_token) {
    const msg =
      typeof tokenJson?.error === "string" ? tokenJson.error : `Token ${tokenRes.status}`;
    throw new Error(`Αποτυχία σύνδεσης Google (${msg})`);
  }

  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${tokenJson.access_token}` },
  });

  const u = (await readJson(userRes)) as Record<string, unknown> | null;
  if (!userRes.ok || !u || typeof u.sub !== "string" || typeof u.email !== "string") {
    throw new Error("Δεν ήταν δυνατή η ανάκτηση στοιχείων λογαριασμού Google.");
  }

  if (u.email_verified === false) {
    throw new Error("Το email Google δεν είναι επιβεβαιωμένο.");
  }

  return {
    sub: u.sub,
    email: u.email,
    email_verified: u.email_verified === true,
    name: typeof u.name === "string" ? u.name : undefined,
  };
}

export async function exchangeFacebookCode(code: string, redirectUri: string): Promise<FacebookUserInfo> {
  const appId = process.env.FACEBOOK_APP_ID?.trim();
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new Error("Δεν έχει ρυθμιστεί το Facebook OAuth (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET).");
  }

  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const tokenRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${tokenParams.toString()}`);
  const tokenJson = (await readJson(tokenRes)) as { access_token?: string; error?: { message?: string } } | null;
  if (!tokenRes.ok || !tokenJson?.access_token) {
    const errMsg = tokenJson?.error && typeof tokenJson.error.message === "string" ? tokenJson.error.message : "";
    throw new Error(errMsg ? `Facebook: ${errMsg}` : "Αποτυχία σύνδεσης Facebook.");
  }

  const meParams = new URLSearchParams({
    fields: "id,name,email",
    access_token: tokenJson.access_token,
  });
  const meRes = await fetch(`https://graph.facebook.com/me?${meParams.toString()}`);
  const me = (await readJson(meRes)) as Record<string, unknown> | null;
  if (!meRes.ok || !me || typeof me.id !== "string") {
    throw new Error("Δεν ήταν δυνατή η ανάκτηση στοιχείων λογαριασμού Facebook.");
  }

  return {
    id: me.id,
    name: typeof me.name === "string" ? me.name : undefined,
    email: typeof me.email === "string" ? me.email : undefined,
  };
}

export function oauthRedirectUri(provider: OAuthProviderId, origin: string): string {
  return `${origin}/api/auth/oauth/${provider}`;
}

export function googleAuthorizeUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error("Λείπει GOOGLE_CLIENT_ID");
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

export function facebookAuthorizeUrl(redirectUri: string, state: string): string {
  const appId = process.env.FACEBOOK_APP_ID?.trim();
  if (!appId) throw new Error("Λείπει FACEBOOK_APP_ID");
  const p = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: "email,public_profile",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${p.toString()}`;
}
