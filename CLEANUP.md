# Cleanup follow-ups

Tracked items deferred from the multi-product entitlement refactor (May 2026).
Non-blocking. Address as priorities permit.

- [ ] Drop dead `api/webhooks/stripe` exemption from Meetings' `middleware.ts` — Meetings does not have a webhook route, so the matcher exclusion is dead.
- [ ] Delete `lib/plans.ts` in both repos once all consumers (`settings/page.tsx`, `DashboardClient`, `DocumentManager`, `app/page.tsx`) are migrated to read display data from `PRODUCTS` or a successor module.
- [ ] Drop `profiles.plan` and `profiles.subscription_status` columns from the shared Supabase schema once confirmed no code reads them. (`profiles.subscription_id` likely also; verify before dropping.)
- [ ] Refresh `app/page.tsx` (public landing) for the multi-product brand. Marketing + engineering decision — not purely refactor.
- [ ] Extract pricing features data to a shared package when product #3 onboards. `lib/products.ts` and `lib/access.ts` are currently hand-synced between repos via the `// SYNCED:` header convention.
- [ ] **Cross-sell false positive for Everything subscribers.** Both cross-sell surfaces (the dashboard toast in `DashboardClient` and the banner in `upgrade/page.tsx`) fire whenever `getEntitlement(uid, "meetings")` returns a row. But a user on the Everything bundle *also* has a meetings entitlement, so they wrongly see "You already have HATE Meetings. Save ~25% by switching to Everything" — they're already on Everything. Fix: only trigger the cross-sell when the user is *not* already on a bundle, i.e. their `meetings` entitlement and their `intelligence` entitlement do **not** share the same `subscription_id`. Needs a richer access helper than `getEntitlement` (which currently discards `subscription_id`) — likely a function that returns the entitlement rows with their `subscription_id`, or a dedicated `isOnBundle(userId)` / `getEntitlementsBySubscription(userId)` helper.
