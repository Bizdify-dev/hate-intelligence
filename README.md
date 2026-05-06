# HATE Intelligence

A no-bullshit internal document Q&A tool for businesses. A product of [Haterz.ai](https://haterz.ai).
**Fuck the Hype. Fix the Work.**

Users subscribe, paste their company documents, and ask questions in plain English. Answers come straight from their docs — never from Claude's general knowledge.

Built with **Next.js 14**, **Supabase**, **Stripe**, and the **Anthropic SDK**.

---

## What you'll set up

1. A Supabase project (auth + Postgres database)
2. A Stripe account (subscription billing)
3. An Anthropic API key (the model that answers questions)
4. The Next.js app, locally first, then on Vercel

Plan to spend ~30 minutes the first time. Have a credit card handy for Stripe; Supabase and Anthropic both have free tiers that are enough to develop against.

---

## 1. Supabase setup

### Create the project

1. Go to <https://supabase.com> → **New project**.
2. Pick a name, a strong DB password, and your nearest region.
3. Wait ~2 minutes for the project to provision.

### Run the schema

1. Open the project → **SQL Editor** → **New query**.
2. Paste the entire contents of [`schema.sql`](./schema.sql) and run it.
3. Verify: in **Table Editor**, you should see `profiles`, `usage`, and `documents`.
4. Verify RLS is on: each table icon should show a lock.

### Grab the keys

In **Project Settings → API** copy:

| Key | Goes into env var |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ **The service-role key bypasses RLS.** It must never reach the browser. The app only uses it from server-side code (webhooks, usage upserts).

### Email confirmation (optional)

By default Supabase requires users to confirm their email. While developing, you can disable this:

- **Project Settings → Authentication → Sign In / Up → Email** → uncheck "Confirm email".

If you keep it on, the signup form shows a "check your inbox" message. The link points back to `/auth/callback?next=/upgrade`, which is already wired up.

### Customise the auth email templates (optional, recommended for prod)

- **Authentication → Email Templates → Confirm signup**
- Replace the default copy with something on-brand. The link variable is `{{ .ConfirmationURL }}`.

Example:

```html
<h2>Welcome to HATE Intelligence</h2>
<p>Confirm your email to start asking your documents anything.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm and continue →</a></p>
<p style="color:#a0a0a0;font-size:12px;">A Haterz.ai product. Fuck the Hype. Fix the Work.</p>
```

### Site URL & redirect URLs

- **Authentication → URL Configuration**
- **Site URL**: `http://localhost:3000` for local, `https://app.haterz.ai` in prod.
- **Redirect URLs**: add `http://localhost:3000/auth/callback` and `https://app.haterz.ai/auth/callback`.

---

## 2. Stripe setup

### Create the products

1. Sign in to <https://dashboard.stripe.com>. Stay in **Test mode** while developing.
2. **Product catalogue → + Create product**.

**Starter**

- Name: `HATE Intelligence — Starter`
- Description: `300 questions/mo · Up to 10 documents · Email support`
- Pricing: **Recurring**, **$29.00 USD**, **Monthly**
- Save → copy the **Price ID** (starts with `price_…`) → into `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`.

**Pro**

- Name: `HATE Intelligence — Pro`
- Description: `1,000 questions/mo · Unlimited documents · Priority support`
- Pricing: **Recurring**, **$79.00 USD**, **Monthly**
- Save → copy the Price ID → into `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`.

### API keys

**Developers → API keys** → copy:

| Key | Env var |
| --- | --- |
| Publishable key (`pk_test_…`) | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Secret key (`sk_test_…`) | `STRIPE_SECRET_KEY` |

### Webhook endpoint

You need a webhook so the app learns when subscriptions activate, update, or cancel.

**Local development** — use the Stripe CLI to forward events to `localhost`:

```bash
# 1. Install the CLI: https://docs.stripe.com/stripe-cli
stripe login

# 2. Forward events (run in a separate terminal while developing)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI prints a signing secret like `whsec_xxx`. Copy it into `STRIPE_WEBHOOK_SECRET`.

**Production** — register a real endpoint:

1. **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://app.haterz.ai/api/webhooks/stripe`
3. Events to send (select these four):
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** → set as `STRIPE_WEBHOOK_SECRET` on Vercel.

### Customer Portal

The Settings page links to Stripe's hosted Customer Portal. Configure it once:

- **Settings → Billing → Customer portal** → enable **"Customers can cancel subscriptions"**, **"Customers can update payment methods"**, etc. Save.

---

## 3. Anthropic setup

1. Sign up at <https://console.anthropic.com>.
2. Add billing (you can start with a small credit; usage is metered).
3. **API Keys → Create Key**. Copy → `ANTHROPIC_API_KEY`.

The default model is `claude-sonnet-4-20250514`. You can swap it in [`lib/anthropic.ts`](./lib/anthropic.ts) — newer Sonnet versions are usually drop-in compatible.

---

## 4. Run locally

```bash
# 1. Copy the env template
cp .env.local.example .env.local
# Fill every value (Supabase × 3, Stripe × 4, Anthropic × 1, app URL)

# 2. Install
npm install

# 3. Run
npm run dev
```

Open <http://localhost:3000>. Flow:

1. **Sign up** (`/signup`) — creates a Supabase user, profile row auto-created via trigger.
2. After signup you're sent to **/upgrade** — pick a plan, redirected to Stripe Checkout.
3. Use a [Stripe test card](https://docs.stripe.com/testing#cards): `4242 4242 4242 4242`, any future date, any CVC.
4. On success Stripe sends `checkout.session.completed` → webhook flips your profile to `active`.
5. You land on **/dashboard** — paste a doc, ask a question.

Don't forget the second terminal for `stripe listen` if you're testing webhooks locally.

### Common first-run issues

| Symptom | Likely cause |
| --- | --- |
| Stuck on `/login` after signup | Supabase email confirmation is on — check your inbox, or disable it for dev. |
| Webhook events show 400 in Stripe CLI | `STRIPE_WEBHOOK_SECRET` mismatch — copy the secret the CLI printed when *this* `stripe listen` started, not a previous one. |
| `/api/ask` returns `subscription_required` | Webhook hasn't fired yet (wait a moment), or you cancelled in test mode. Check the `profiles` row in Supabase. |
| `[error] anthropic_error: 401` | `ANTHROPIC_API_KEY` is wrong or your account has no credit. |
| TypeScript complains about `@/lib/...` paths | `tsconfig.json` paths are correct — restart your editor's TS server. |

---

## 5. Deploy to Vercel

1. Push the `hate-intelligence/` folder to a GitHub repo.
2. <https://vercel.com> → **Add New → Project** → import the repo.
3. **Root Directory**: leave as default if `hate-intelligence/` is the repo root, otherwise set to `hate-intelligence`.
4. **Framework Preset**: Next.js (auto-detected).
5. **Environment Variables** — add every key from `.env.local`. For `NEXT_PUBLIC_APP_URL`, use your final domain, e.g. `https://app.haterz.ai`.
6. Deploy.

### Custom domain

- **Vercel project → Settings → Domains → Add** → `app.haterz.ai`.
- Add the CNAME / A record Vercel shows you in your DNS provider.

### Update Supabase + Stripe with the prod URL

- Supabase → **Authentication → URL Configuration** → add `https://app.haterz.ai/auth/callback` to Redirect URLs and set **Site URL**.
- Stripe → register the production webhook (see step 2).

### Switching Stripe to live mode

When you're ready to take real money:

1. Toggle Stripe dashboard from **Test mode** to **Live mode**.
2. Re-create the two products in Live mode (test prices don't carry over).
3. Generate Live API keys → update Vercel env vars.
4. Register a Live webhook endpoint → update `STRIPE_WEBHOOK_SECRET`.

---

## Project layout

```
hate-intelligence/
├── app/
│   ├── (auth)/login, signup           ← email/password auth screens
│   ├── (dashboard)/dashboard, settings, upgrade
│   ├── api/
│   │   ├── ask                        ← Claude proxy with auth + usage gates
│   │   ├── documents                  ← CRUD on user docs
│   │   ├── usage                      ← current month counter
│   │   ├── create-checkout-session    ← Stripe Checkout entry
│   │   ├── billing-portal             ← Stripe Customer Portal entry
│   │   └── webhooks/stripe            ← signature-verified webhook
│   ├── auth/callback                  ← Supabase email confirmation handler
│   └── page.tsx                       ← marketing landing page
├── components/                        ← Navbar, DocumentManager, ChatInterface, UsageBar, PricingCard, Toast
├── lib/
│   ├── supabase/                      ← client, server, admin, middleware
│   ├── anthropic.ts                   ← Claude client + system prompt
│   ├── stripe.ts                      ← Stripe client
│   ├── plans.ts                       ← Single source of truth for plan limits
│   └── rate-limit.ts                  ← Simple in-memory rate limiter
├── middleware.ts                      ← session refresh + protected route gating
├── schema.sql                         ← Run in Supabase SQL editor
└── .env.local.example
```

## Architectural notes

- **The Anthropic API key is server-only.** All Claude calls go through `/api/ask`. There is no path for it to reach the browser.
- **Plan limits live in one file.** `lib/plans.ts` defines questions/month, document count, char-per-doc. Every gate (UI, API) reads from there — change it once.
- **Usage tracking is partition-by-month.** A row per `(user_id, 'YYYY-MM')` with an integer counter. No cron, no scheduled reset — June 1 just changes the partition key.
- **Prompt caching is on by default.** The system block (with all your documents) is wrapped in `cache_control: { type: 'ephemeral' }` so follow-up questions in the same chat read docs from Anthropic's cache at ~10% input cost.
- **RLS does the security.** Browser code uses the anon key + RLS to enforce per-user access at the Postgres layer. The service-role client is only used for admin work (webhooks, usage upserts) where bypassing RLS is intentional.
- **Webhook signature verification needs the raw body.** `app/api/webhooks/stripe/route.ts` calls `req.text()` not `req.json()`.
- **The middleware excludes `/api/webhooks/stripe`** because Stripe doesn't send a Supabase auth cookie — running it through the auth refresh would just add latency.

## Production hardening checklist

- [ ] Replace the in-memory rate limiter with [Upstash Ratelimit](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview). The current limiter resets on every Vercel cold start and isn't shared across instances.
- [ ] Set up Sentry or Vercel Analytics to catch silent webhook failures.
- [ ] Add a CRON to refresh stalled `past_due` subscriptions weekly (Stripe will, but you may want your own check).
- [ ] Restrict your Stripe API key to only the events the app uses.
- [ ] Add an export endpoint so users can download all their docs as JSON (data portability).

---

Built by [Haterz.ai](https://haterz.ai). Questions: <wtf@haterz.ai>.
