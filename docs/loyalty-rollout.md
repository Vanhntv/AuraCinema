# Membership, rewards and personal vouchers

## Runtime

MongoDB must be a replica set (including a single-node development replica set) or a sharded cluster. Booking, payment, expiry, admin cancellation, redemption and grant writes must not fall back to nontransactional execution. Do not change the topology of a running database without a backup.

`LOYALTY_REDEMPTION_ENABLED` defaults to false. Set it to `true` only after the integration suite and reconciliation succeed. Existing users also require `loyalty_reconciled_at`; newly created zero-balance accounts start reconciled. Points have no expiry in this release. Negative historical or adjusted balances remain visible as zero spendable points and a separate debt amount.

## Reconciliation

From `backend`, run `npm run reconcile:loyalty` first. It reads the configured MongoDB and prints per-user discrepancies without changing balances or indexes. Exit code 2 means mismatches need review. Then run `npm run reconcile:loyalty -- --apply` in a maintenance window. This adds unique indexes, reconstructs missing logs with unknown historical balances, persists card codes, snapshots legacy wallet entries and marks only matching accounts reconciled. It never credits an order again or invents an opening balance. Do not enable redemption for unresolved accounts.

The script does not infer historic activation dates. Legacy wallet ownership and usage should be reviewed before enabling personal voucher checkout; old records without snapshots are displayed as unavailable until migrated. Missing templates remain visible as paused entries.

## Business rules

- Net paid spending determines Member / VIP at 3,000,000 VND / VVIP at 10,000,000 VND. Refunds recalculate the tier.
- Earn `floor(net paid / 10,000)` points. Ticket and food spending both qualify. Paid bookings cannot be cancelled or refunded, including by admins. A showtime with a paid booking cannot be cancelled. Unpaid cancellation releases reserved vouchers only.

Late payments are stored as `review_required` and must never reclaim released seats. Old payment states and reversal timestamps are retained only for reading historical records; admin cannot select those states. Reconciliation flags historical reversals for manual review instead of recreating them. Removing the workflow does not rewrite existing database records or test fixtures already inserted.
- Configuring a reward or issuing a grant changes that template to personal-only. Its public code no longer applies to new orders. Existing reservations remain valid.
- Each issued voucher allocates one unit of template inventory and snapshots terms. Checkout reserves the owned entitlement, not another template unit. Quantity shown in admin is unallocated inventory. Admin edits use a stock version check to avoid overwriting concurrent allocation.
- A held voucher is honored until the booking payment deadline, including if its campaign changes after reservation. Failed/expired/cancelled bookings release it; the wallet then derives availability from its original expiry and live campaign status. Used vouchers stay in history even after template deletion.
- Admin grants have a persisted preview of at most 500 recipients. Confirming the same preview twice does not issue twice. A changed recipient account aborts confirmation.
- Reward cost is configured by admin, never inferred from discount value. Retrying redemption uses the same request key and returns the original entitlement without charging again.

## APIs

All customer routes below require an authenticated user; admin routes require admin role.

- `GET /api/loyalty/membership`, `GET /api/loyalty/points?page=1&type=earn` (10 entries/page).
- `GET /api/loyalty/rewards`, `POST /api/loyalty/rewards/:id/redeem` with `{key}`.
- `GET|PUT /api/loyalty/admin/rewards`; PUT accepts `{voucher_id, points_cost, active}`.
- `POST /api/loyalty/admin/grants/preview` with `{key, voucher_id, email}` or `{key, voucher_id, tier}`; confirm with `POST /api/loyalty/admin/grants/:id/confirm`.
- `GET /api/loyalty/admin/grants?page=1`, existing `GET /api/vouchers/my-wallet`.
- Existing voucher verify and booking creation accept `user_voucher_id`; personal codes are also accepted and always checked against the authenticated owner.

## Verification

Run `npm test` in backend. `test/loyalty.integration.test.js` starts and removes its own temporary MongoDB replica set, using `mongod` from PATH or `MONGOD_BINARY`. It never connects to the application database. A skip is not a successful concurrency validation. Run frontend tests and build separately. Validate membership, points, redemption, voucher detail and admin grant screens on desktop and mobile before enabling the flag.
