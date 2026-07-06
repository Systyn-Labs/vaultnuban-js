# @systynlabs/vaultnuban

## 0.2.0

### Minor Changes

- [`77e16b6`](https://github.com/Systyn-Labs/vaultnuban-js/commit/77e16b64b7144622a238ccf3e39343de87ea81fa) Thanks [@kellslte](https://github.com/kellslte)! - Add a `mfa` resource (`status`, `setup`, `enable`, `verify`, `regenerateRecoveryCodes`) for mandatory TOTP + recovery-code MFA, and a `userSessionToken` client option plus `stepUpToken` per-request option so mutating calls can carry the per-user session and step-up headers (`X-User-Session`, `X-Step-Up-Token`).

  **Breaking for server-to-server integrators:** the API now requires a valid `X-User-Session` (and, on Nomba-mutating routes, a fresh `X-Step-Up-Token`) for provisioning/renaming/suspending/closing a virtual account and for initiating withdrawals. Callers using only the tenant API key with no dashboard human behind them will need to mint a user session via `/auth/login` to keep using those specific endpoints.
