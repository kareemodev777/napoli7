# Spec: Custom SMTP for Supabase Auth Emails (Resend, Free Tier)

**Status:** Planned 2026-06-04 · **Phase:** 5 (Admin, SEO, Polish) follow-up · **Type:** Configuration (no code change)

## Goal

Route Supabase **auth emails** — signup confirmation, magic link, password reset
— through a **custom SMTP** sender on the `napoli7.com` domain, replacing
Supabase's default email service. The default sender is rate-limited to ~2–4
emails/hour, carries Supabase branding, and is documented as test-only; it will
silently drop emails under real signup volume. We use **Resend's free tier** for
SMTP since the project already sends order emails through Resend.

## Context / what already exists

- **Hosting:** Supabase Cloud, project ref `wkmilylccstptgpeyzaw`. No
  `supabase/config.toml` — auth/SMTP/template config is managed in the
  **Supabase dashboard**.
- **Auth email triggers** (all currently on Supabase default sender):
  - `src/app/register/actions.ts` → `supabase.auth.signUp(...)` (confirmation),
    redirect `…/login?confirmed=true`.
  - `src/app/login/actions.ts` → `supabase.auth.signInWithOtp(...)` (magic link)
    and `supabase.auth.resetPasswordForEmail(...)` (reset).
- **Resend already integrated** for transactional/order email in
  `src/lib/notifications/email.ts` (`notifyKitchenEmail`,
  `notifyCustomerStatusEmail`, `notifyContactMessageEmail`), sending from
  `orders@napoli7.com`. So `napoli7.com` is already a verified Resend domain.
- **Branded auth templates** in `supabase/templates/` (`confirm-signup.html`,
  `magic-link.html`, `reset-password.html`, `invite.html`) — **already applied**
  in the Supabase dashboard. They remain the version-controlled source of truth.
- **Env keys** (`src/lib/env.ts`): `RESEND_API_KEY`, `ORDER_EMAIL_FROM/TO`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`.

## Key point: this is dashboard config, not code

Auth emails are sent by **Supabase's servers**, not by our Next.js app. The SMTP
credentials are entered in the Supabase dashboard and never touch the repo. There
is **no `.env` or source change** in this spec.

## Free-tier reality check

- Resend free = **3,000 emails/month, 100/day, 1 verified domain**.
- Auth emails and existing order/contact emails share the **same** 3,000/month
  quota (one Resend account). Adequate for early launch; revisit if combined
  volume grows.

## Non-goals

- No `config.toml` / CLI-pushed template management (optional future follow-up,
  see below).
- No second email vendor (Brevo, SendGrid, etc.).
- No changes to the auth action code or the HTML templates.
- No transactional/order email changes — those stay as-is on Resend.

## Deliverables (dashboard steps)

### 1. Resend — verify domain + create sending key
- **Domains:** confirm `napoli7.com` is **Verified** (already true for order
  emails; if not, publish the SPF/DKIM/DMARC DNS records Resend lists).
- **API Keys → Create:** name `supabase-smtp`, permission **Sending access**,
  copy the `re_...` key (shown once). A dedicated key keeps it independently
  revocable from `RESEND_API_KEY`.

### 2. Supabase Dashboard → Authentication → Emails → SMTP Settings
Enable **Custom SMTP** and enter:
- **Sender email:** `no-reply@napoli7.com` (must be on the verified domain)
- **Sender name:** `Napoli 7`
- **Host:** `smtp.resend.com`
- **Port:** `587` (STARTTLS; `465` for implicit TLS also valid)
- **Username:** `resend` (literal)
- **Password:** the `re_...` key from step 1
- **Save.**

### 3. Supabase Dashboard → Authentication → Rate Limits
- Raise **"Rate limit for sending emails"** from the post-SMTP default (~30/hr)
  to ~**100/hr**, staying within Resend's 100/day free cap.

### 4. Sender-domain sanity check
- The Supabase **Sender email** domain must exactly match a Resend-verified
  domain, or Resend rejects the send and Supabase reports a failed auth email.

## Verification (end-to-end)

1. **Signup:** register a fresh test email at `https://napoli7.com/register`.
   Confirm the email (a) arrives within seconds, (b) is **from**
   `no-reply@napoli7.com` / "Napoli 7" (not `…@mail.app.supabase.io`),
   (c) renders the branded template, (d) the Confirm link lands on
   `/login?confirmed=true` and the account is confirmed.
2. **Magic link:** run the `sendMagicLink` flow; confirm the sign-in email
   arrives and authenticates.
3. **Password reset:** trigger reset; confirm the branded reset email arrives.
4. **Resend → Logs:** each test send appears as delivered (proves routing
   through Resend, not Supabase default).
5. **Headers:** open a received email's headers; confirm SPF/DKIM **pass** for
   `napoli7.com`.

## Optional future follow-up

Version-control the auth config + templates via `supabase/config.toml`
(`[auth.email.template.*]` pointing at `supabase/templates/*.html`) and push with
`supabase link` + config/db push, replacing hand-editing in the dashboard.
Out of scope here.
