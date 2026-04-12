import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { authAppOrigin } from "@/lib/auth-app-url";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth-cookie";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";
import { signSessionToken, signOAuthState, verifyOAuthState } from "@/lib/auth-jwt";
import {
  exchangeFacebookCode,
  exchangeGoogleCode,
  facebookAuthorizeUrl,
  googleAuthorizeUrl,
  oauthRedirectUri,
} from "@/lib/auth-oauth-exchange";
import type { OAuthProviderId } from "@/lib/auth-oauth-upsert";
import { upsertUserFromOAuth } from "@/lib/auth-oauth-upsert";
import { safeInternalPath } from "@/lib/safe-redirect";
import { parseSessionUser } from "@/lib/user-session-types";

export const runtime = "nodejs";

function isProvider(v: string): v is OAuthProviderId {
  return v === "google" || v === "facebook";
}

function redirectAuthEmail(origin: string, message: string) {
  const q = new URLSearchParams();
  q.set("oauth_error", message);
  return NextResponse.redirect(`${origin}/auth/email?${q.toString()}`);
}

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await ctx.params;
  if (!isProvider(raw)) {
    return NextResponse.json({ error: "Άγνωστος πάροχος" }, { status: 404 });
  }
  const provider = raw;

  const origin = authAppOrigin();
  const redirectUri = oauthRedirectUri(provider, origin);
  const url = new URL(req.url);

  const oauthErr = url.searchParams.get("error");
  const oauthErrDesc = url.searchParams.get("error_description");
  if (oauthErr) {
    const parts = [oauthErr, oauthErrDesc].filter((x): x is string => typeof x === "string" && x.length > 0);
    const msg = parts.length ? parts.join(" — ") : "Η σύνδεση ακυρώθηκε.";
    return redirectAuthEmail(origin, msg.slice(0, 500));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    try {
      const payload = await verifyOAuthState(state);
      if (!payload || payload.provider !== provider) {
        return redirectAuthEmail(origin, "Άκυρο ή ληγμένο αίτημα σύνδεσης. Δοκίμασε ξανά.");
      }

      const nextPath = safeInternalPath(payload.next);

      if (provider === "google") {
        const g = await exchangeGoogleCode(code, redirectUri);
        const user = await upsertUserFromOAuth({
          provider: "google",
          providerAccountId: g.sub,
          email: g.email,
          name: g.name ?? g.email.split("@")[0] ?? "Χρήστης",
        });
        const sessionUser = parseSessionUser(user);
        if (!sessionUser) throw new Error("Αποτυχία δημιουργίας συνεδρίας");
        const token = await signSessionToken(sessionUser.id);
        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(60 * 60 * 24 * 7));
        return NextResponse.redirect(`${origin}${resolvePostAuthRedirect(sessionUser, nextPath)}`);
      }

      const f = await exchangeFacebookCode(code, redirectUri);
      if (!f.email) {
        return redirectAuthEmail(
          origin,
          "Το Facebook δεν έδωσε email. Δώσε πρόσβαση στο email ή χρησιμοποίησε Google / email."
        );
      }
      const user = await upsertUserFromOAuth({
        provider: "facebook",
        providerAccountId: f.id,
        email: f.email,
        name: f.name ?? f.email.split("@")[0] ?? "Χρήστης",
      });
      const sessionUser = parseSessionUser(user);
      if (!sessionUser) throw new Error("Αποτυχία δημιουργίας συνεδρίας");
      const token = await signSessionToken(sessionUser.id);
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(60 * 60 * 24 * 7));
      return NextResponse.redirect(`${origin}${resolvePostAuthRedirect(sessionUser, nextPath)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Αποτυχία σύνδεσης";
      return redirectAuthEmail(origin, msg.slice(0, 500));
    }
  }

  try {
    const nextPath = safeInternalPath(url.searchParams.get("next"));
    const stateToken = await signOAuthState(nextPath, provider);
    const loc =
      provider === "google"
        ? googleAuthorizeUrl(redirectUri, stateToken)
        : facebookAuthorizeUrl(redirectUri, stateToken);
    return NextResponse.redirect(loc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ρύθμιση OAuth";
    return redirectAuthEmail(origin, msg.slice(0, 500));
  }
}
