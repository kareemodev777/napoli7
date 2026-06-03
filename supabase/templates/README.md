# Napoli 7 — Auth email templates

Branded HTML for Supabase Auth emails. These are **not** auto-deployed — they live
in the Supabase dashboard. Paste each file's contents into the matching template
under **Authentication → Emails → Templates**, then **Save**.

| File | Supabase template | Suggested subject | Key variable(s) |
|---|---|---|---|
| `confirm-signup.html` | Confirm signup | Confirm your Napoli 7 account | `{{ .ConfirmationURL }}` |
| `magic-link.html` | Magic Link | Sign in to Napoli 7 | `{{ .ConfirmationURL }}` |
| `reset-password.html` | Reset Password (Recovery) | Reset your Napoli 7 password | `{{ .ConfirmationURL }}` |
| `invite.html` | Invite user | You're invited to Napoli 7 | `{{ .ConfirmationURL }}` |
| `change-email.html` | Change Email Address | Confirm your new Napoli 7 email | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}` |
| `reauthentication.html` | Reauthentication | Your Napoli 7 verification code | `{{ .Token }}` (6-digit code, not a link) |

## Design
- White canvas, navy `#1E3A8A` CTA, sharp 0px corners, Helvetica-family UPPERCASE
  headings — per `docs/DESIGN.md`. Italian-flag micro-strip at the top.
- Logo loads from the canonical `https://napoli7.com/logo.png` (DNS is live and
  serving over SSL). The `napoli7.netlify.app/logo.png` subdomain still works as a
  fallback if the apex ever changes.
- Forces light mode (`color-scheme: light only`) so clients don't dark-invert it.
- Bulletproof for Outlook (VML button), mobile-responsive, hidden preheader.

## Preview locally
```bash
# substitute a sample link/token, then open in a browser
sed 's|{{ .ConfirmationURL }}|https://example.com/verify?token=demo|g' \
  supabase/templates/confirm-signup.html > /tmp/preview.html && open /tmp/preview.html
```
