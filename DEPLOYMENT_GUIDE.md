# Napoli7 Deployment Guide

This repo has more than one Netlify-related target visible from the local machine. Follow this guide every time so Napoli7 is deployed to the real production site, not the old/staging `napoli7-live` project.

## Production source of truth

Production Netlify site:

- Site name: `napoli7`
- Site ID: `b26554a5-e555-41c9-a17a-d11927249b8c`
- Netlify account name: `Napoli 7`
- Netlify account slug: `bocchi-2`
- Git repo: `https://github.com/kareemodev777/napoli7`
- Production branch: `main`
- Primary domain: `https://napoli7.com`
- Netlify subdomain: `https://napoli7.netlify.app`
- Branch deploy URL shape: `https://main--napoli7.netlify.app`

Do not deploy production updates to:

- `napoli7-live`
- `https://napoli7-live.netlify.app`
- Account/team `777`

That project is not the real Napoli7 production site.

Also note: `napoli7.netflify.app` is a typo and will not resolve. The correct Netlify subdomain is `napoli7.netlify.app`.

## Golden rule

For production updates, prefer this path:

1. Commit locally.
2. Push `main` to GitHub.
3. Let the connected Netlify production site `napoli7` build from Git.
4. Verify `https://napoli7.netlify.app` and `https://napoli7.com`.

Do not trust the local `.netlify/state.json` or `netlify status` by itself. At the time this guide was created, the local working copy was linked to the wrong Netlify project (`napoli7-live`).

## Pre-deploy checklist

Run from the repo root:

```bash
cd /Users/kareemo/Projects/napoli7

git status --short --branch
git log --oneline --decorate -5
```

Confirm:

- You are on `main`.
- The intended commits are present.
- There are no accidental uncommitted changes unless you intentionally want to include them in a separate local deploy.

Verify the real production Netlify site by API lookup:

```bash
netlify api getSite --data '{"site_id":"napoli7.netlify.app"}'
```

Expected production values:

- `id`: `b26554a5-e555-41c9-a17a-d11927249b8c`
- `name`: `napoli7`
- `account_slug`: `bocchi-2`
- `account_name`: `Napoli 7`
- `custom_domain`: `napoli7.com`
- `repo_url`: `https://github.com/kareemodev777/napoli7`

If you see `napoli7-live`, `napoli7-live.netlify.app`, or account/team `777`, stop. That is the wrong project for production.

## Local validation gate

Before pushing/deploying production code, run:

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run build
```

Expected: all commands exit successfully.

If checking Netlify-specific packaging locally, prefer:

```bash
netlify build --offline
```

Netlify CLI can inject remote secret placeholders during local builds. If remote secrets are marked as Netlify “secret” values, `netlify build` may show misleading provider errors such as `Invalid API key`. A plain `bun run build` with `.env.local` is the main local code gate.

## Recommended production deployment

After local validation passes and the intended changes are committed:

```bash
git status --short --branch
git push origin main
```

Then poll the real production Netlify site:

```bash
netlify api getSite --data '{"site_id":"napoli7.netlify.app"}'
```

Confirm the latest deploy changes to a new deploy ID. To inspect the deploy:

```bash
netlify api getDeploy --data '{"deploy_id":"DEPLOY_ID_FROM_GET_SITE"}'
```

Expected deploy values:

- `state`: `ready`
- `branch`: `main`
- `context`: `production`
- `url`: `https://napoli7.com`
- `deploy_ssl_url`: `https://main--napoli7.netlify.app`
- `commit_ref`: the commit you just pushed

## Emergency direct deploy, only if Git auto-deploy is blocked

Use this only when the Git-connected production deploy cannot run and you explicitly need to deploy the local working tree.

Important: local CLI deploys can target the wrong site if the repo is linked to `napoli7-live`. Always pass the real production site ID explicitly.

```bash
set -o pipefail
bun run lint
bun run typecheck
bun run build
netlify deploy --prod --build --site b26554a5-e555-41c9-a17a-d11927249b8c
```

If this returns `JSONHTTPError: Not Found`, the current Netlify auth context does not have deploy access to the `Napoli 7` account. Do not fall back to `napoli7-live`. Ask for the correct Netlify account access/token or use the Git push deployment path if GitHub auto-deploy is connected.

## Secret hygiene

Never print or commit values for:

- `NETLIFY_AUTH_TOKEN`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- WhatsApp tokens or phone-number IDs

It is safe to report key names, whether they exist, and value lengths. Do not paste values into chat, logs, docs, or commits.

If `.env.local` contains a `NETLIFY_AUTH_TOKEN`, remember that it can override the logged-in CLI user. If commands unexpectedly show or deploy to the wrong account, unset it for that shell:

```bash
unset NETLIFY_AUTH_TOKEN
```

## Production smoke test

Always smoke the stable production URLs, not only a unique deploy URL.

```bash
for url in \
  https://napoli7.netlify.app/ \
  https://napoli7.netlify.app/menu \
  https://napoli7.netlify.app/checkout \
  https://napoli7.com/ \
  https://napoli7.com/menu
  do
    printf '%s ' "$url"
    curl -sS -L -o /tmp/napoli7_smoke_body \
      -w 'status=%{http_code} bytes=%{size_download} type=%{content_type} final=%{url_effective}\n' \
      "$url"
  done
```

Expected: HTTP `200` for each route.

For browser smoke, load:

- `https://napoli7.netlify.app/`
- `https://napoli7.netlify.app/menu`
- `https://napoli7.com/`
- `https://napoli7.com/menu`

Check:

- Page renders Napoli7 content.
- Menu route shows the expected menu sections/products.
- Browser console has no JavaScript errors.

## Final handoff format

When reporting a successful deployment, include:

- Correct site: `napoli7`
- Correct account: `Napoli 7` / `bocchi-2`
- Live URL: `https://napoli7.netlify.app`
- Custom domain: `https://napoli7.com`
- Deploy ID
- Commit SHA deployed
- Validation commands run
- Smoke-tested routes

Do not report `napoli7-live.netlify.app` as production.
