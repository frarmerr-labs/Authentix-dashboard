# Changelog

## 2026-01-13
- Added post-login bootstrap flow to provision organization before redirect.
- Added dashboard guard to bootstrap organization when missing and redirect to the correct org.
- Added `api.auth.bootstrap` helper for reuse.
- Improved timeout messaging in dashboard resolver (client-side).
