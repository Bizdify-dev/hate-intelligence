# HANDOFF — HATE multi-product entitlement refactor

Session wrap-up. Read this first next session.

## Current branch

`claude/webhook-error-logging` — branched off `claude/refactor-shared-subscriptions-Nbk3C`.

Three commits on it, all pushed to origin:

- `486fd3f` — diagnostic logging in the Stripe webhook catch block (logs
  event type/id plus any Supabase error `code`/`constraint`/`detail`).
  Permanent observability improvement.
- `04d1934` — webhook race-condition fix: entitlements are written via
  `upsert` on `(subscription_id, product_key)` instead of delete-then-insert;
  the `customer.subscription.created` handler was removed (it raced the
  `.updated` event and left subscriptions stuck at `incomplete`).
- `0fa9298` — CLEANUP.md doc update (cross-sell bug diagnoses).

The bulk of the refactor (steps 1–9: schema, products/access libs, webhook
rewrite, gate refactor, /upgrade redesign) is on the parent branch
`claude/refactor-shared-subscriptions-Nbk3C`.

## Phase A — testing: COMPLETE

All 5 Phase A tests pass on the fixed code. Cross-product shared entitlements
proven end-to-end:

- An Everything subscription unlocks both Intelligence and Meetings.
- A Meetings-standalone subscription correctly leaves Intelligence gated.
- Cancellation propagates to both apps.

## Known bugs — non-blocking (full diagnosis in CLEANUP.md)

Cross-sell toast, two misbehaviors:

- **Bug A** — the toast fires for Everything subscribers, who already own
  both products. It should not.
- **Bug B** — the toast does not fire for a single-product subscriber
  visiting the other app, where it should. Most likely a test artifact (the
  one-shot localStorage key was burned by an earlier test run) rather than an
  Intelligence code defect — see CLEANUP.md.

Neither blocks deploy. CLEANUP.md also tracks other deferred items
(stale `schema.sql`, `lib/plans.ts` deletion, vestigial `profiles` columns,
public landing refresh, observability for `parseEntitlements` warn-on-empty).

## Next session — Phase B: DEPLOY

Steps, in order:

a. **Decide:** fix the cross-sell bugs first, or ship and fix in v1.1.
b. **Merge:** `claude/webhook-error-logging` → `claude/refactor-shared-subscriptions-Nbk3C`
   → `main`. Single PR for the whole refactor.
c. **Push Meetings to GitHub** — already backed up at
   https://github.com/joiedevieve/hate-meetings.
d. **Vercel:** redeploy Intelligence from the new `main` (already live at
   app.haterz.ai); create a new Vercel project for Meetings → meetings.haterz.ai.
e. **Supabase:** add `meetings.haterz.ai/auth/callback` to the auth redirect URLs.
f. **Stripe live mode:** recreate the 6 prices with `entitlements` metadata;
   update the price-ID env vars in both Vercel projects.
g. **Stripe live webhook:** register the production endpoint, capture the
   signing secret, add it to the Intelligence Vercel env as
   `STRIPE_WEBHOOK_SECRET`. (Webhooks live only in Intelligence.)
h. **Smoke test in production** with a real card; refund immediately.
i. **Pre-launch:** re-enable Supabase email confirmation.
