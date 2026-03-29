# Dependency + Enterprise Audit (2026-03-26)

This is a **no-code-change audit** of the current frontend (`Authentix-dashboard`) for worldwide production readiness.

## Scope

- Reviewed `package.json`, lock state, runtime/security files, and key application flows.
- Pulled live version drift using `npm outdated`.
- Ran dependency hygiene scan (`depcheck`) and cross-checked with current code usage.
- Focused on: **upgrade risk, waste, security posture, operational maturity, and enterprise scale readiness**.

---

## 1) Executive Verdict

| Area | Current Status | Enterprise Verdict | Priority |
|---|---|---|---|
| Core architecture (Next BFF/proxy + HttpOnly cookies) | Strong | Correct pattern for global production | P0 keep |
| Security baseline (headers, route allowlist, auth checks) | Good | Strong baseline, but CSP should be tightened | P1 |
| Dependency freshness | Mixed | Mostly healthy, but several majors behind | P1 |
| Dependency hygiene | Mixed | Some likely waste and missing declared lint deps | P1 |
| Type safety / strictness | Moderate | Good TS usage, but `any` hotspots remain | P1 |
| Observability / SRE readiness | Weak | Heavy console logs, no formal tracing/metrics stack | P0 |
| Release governance | Moderate | Tests exist, but needs stricter update policy + SBOM/security gates | P1 |

---

## 2) Version Drift Table (Current vs Latest in 2026)

Source: `npm outdated --json` (run on 2026-03-26).

| Package | Current | Latest | Gap Type | Recommendation |
|---|---:|---:|---|---|
| `next` | `16.1.1` | `16.2.1` | Minor | Upgrade soon; low/medium risk |
| `react` | `19.2.3` | `19.2.4` | Patch | Upgrade now; low risk |
| `react-dom` | `19.2.3` | `19.2.4` | Patch | Upgrade now; low risk |
| `typescript` | `5.9.3` | `6.0.2` | Major | Plan migration branch; medium/high risk |
| `eslint` | `9.39.2` | `10.1.0` | Major | Hold until plugin ecosystem verified |
| `eslint-config-next` | `16.1.1` | `16.2.1` | Minor | Upgrade with Next |
| `vitest` | `3.2.4` | `4.1.2` | Major | Schedule test infra upgrade sprint |
| `@vitest/coverage-v8` | `3.2.4` | `4.1.2` | Major | Keep in lockstep with Vitest |
| `@vitejs/plugin-react` | `4.7.0` | `6.0.1` | Major | Upgrade only with Vitest/Vite matrix test |
| `jsdom` | `26.1.0` | `29.0.1` | Major | Upgrade during test infra pass |
| `tailwindcss` | `4.1.18` | `4.2.2` | Minor | Upgrade; validate design tokens |
| `@tailwindcss/postcss` | `4.1.18` | `4.2.2` | Minor | Upgrade with Tailwind together |
| `lucide-react` | `0.562.0` | `1.7.0` | Major | Optional; run icon API compatibility check |
| `react-dropzone` | `14.3.8` | `15.0.0` | Major | Upgrade if upload UX regression suite passes |
| `react-pdf` | `10.3.0` | `10.4.1` | Minor | Upgrade; validate PDF rendering |
| `recharts` | `3.8.0` | `3.8.1` | Patch | Upgrade now |
| `csv-stringify` | `6.6.0` | `6.7.0` | Minor | Upgrade now |
| `tailwind-merge` | `3.4.0` | `3.5.0` | Minor | Upgrade now |
| `@types/react` | `19.2.8` | `19.2.14` | Patch | Upgrade now |
| `@types/node` | `22.19.5` | `25.5.0` | Major | Keep aligned with runtime Node policy |
| `@eslint/eslintrc` | `3.3.3` | `3.3.5` | Patch | Upgrade now |

---

## 3) Waste / Keep / Replace Table (Dependency Hygiene)

## 3.1 Likely Waste (verify before removal)

| Package | Signal | Why it may be waste | Action |
|---|---|---|---|
| `@radix-ui/react-checkbox` | `depcheck` unused | No direct imports detected | Verify via UI grep + remove if truly unused |
| `date-fns-tz` | `depcheck` unused | `date-fns` is used; timezone helper imports not found | Remove or start using explicitly for timezone-safe reporting |
| `react-resizable` | `depcheck` unused | Not clearly imported in current tracked files | Confirm and remove if dead |

## 3.2 Declared-But-Missing (important)

| Package | Signal | Why this matters | Action |
|---|---|---|---|
| `pdfjs-dist` | Marked missing by depcheck but imported | Runtime uses PDF workers; undeclared dep can break CI/reproducibility | Add explicitly to `dependencies` |
| `@eslint/js` | Used in `eslint.config.mjs`, missing declaration | Lint environment can become non-deterministic | Add to `devDependencies` |
| `@typescript-eslint/eslint-plugin` | Used in lint config, missing declaration | Same as above | Add |
| `@typescript-eslint/parser` | Used in lint config, missing declaration | Same as above | Add |
| `eslint-plugin-react` | Used in lint config, missing declaration | Same as above | Add |
| `eslint-plugin-react-hooks` | Used in lint config, missing declaration | Same as above | Add |

## 3.3 Keep (Strong fit for product)

| Group | Packages | Why keep |
|---|---|---|
| Core app platform | `next`, `react`, `react-dom`, `typescript` | Correct stack for your architecture and scaling goals |
| Security-aligned BFF | Internal API routes + proxy model | Enables centralized request hardening and token safety |
| UI primitives | Radix packages + Tailwind stack | Good accessibility + consistency baseline |
| Cert/document tooling | `pdf-lib`, `react-pdf`, `qrcode`, `xlsx`, `jszip`, `csv-stringify` | Directly aligned with certificate product domain |
| Builder UX | `@dnd-kit/*`, `react-dropzone`, `react-colorful`, `nanoid` | Supports interactive authoring and uploads |
| Quality stack | `vitest`, Testing Library, Playwright | Balanced unit + E2E coverage approach |

---

## 4) Enterprise Readiness Findings (Codebase-Level)

| Domain | Current Observation | Risk at global scale | Recommendation |
|---|---|---|---|
| Observability | Many `console.*` calls in critical runtime paths (proxy/auth/layout/generation) | Noisy logs, poor correlation, weak incident triage | Introduce structured logger (`pino`/`winston`) + request IDs everywhere |
| Tracing | No distributed tracing framework visible | Hard root-cause across frontend->proxy->backend | Add OpenTelemetry spans + correlation IDs |
| Metrics | No service-level metrics/export pattern visible | Weak SLO/SLA enforcement | Add RED metrics (rate/errors/duration) for API routes |
| Error management | Error handling exists but centralized error reporting not evident | Production issues can be silent | Add Sentry (or equivalent) for FE + Next route handlers |
| CSP policy | Includes `'unsafe-inline'` and `'unsafe-eval'` | Increased XSS attack surface | Move to nonce/hash-based CSP plan in phases |
| Dependency governance | No explicit automated dependency policy shown | Upgrade lag + surprise breakages | Add Renovate/Dependabot with staged rules |
| Supply-chain security | No SBOM/pinning policy documented | Compliance and audit friction | Add SBOM generation + license/security scan in CI |
| Type strictness | TS strict used, but `any` usage exists in key feature files | Runtime drift and hidden bugs | Gradually eliminate `any` in hot paths first |
| Config hygiene | NPM warning: unknown env config `devdir` | Build-tool unpredictability | Clean user/team npm config and codify setup |
| Runtime target | Node pinned to `>=24` | Need clear LTS policy for enterprise infra | Define and document approved runtime matrix |

---

## 5) Priority Action Plan (No-Code Proposal)

## P0 (immediate, enterprise-blocking)

| Action | Status | Outcome |
|---|---|---|
| Formalize observability stack (structured logs + error tracking + trace IDs) | ✅ DONE 2026-03-28 — `src/lib/logger.ts` facade; all `console.*` replaced in `client.ts` and proxy route | Production support readiness |
| Add missing declared lint/runtime dependencies (`pdfjs-dist`, eslint plugin set) | ✅ DONE 2026-03-28 | Deterministic CI and reproducible builds |
| Establish dependency update policy (monthly + emergency patch lane) | ✅ DONE 2026-03-29 — `.github/dependabot.yml`; monthly npm + GitHub Actions updates; patch/minor batched; majors blocked for manual review | Reduce supply-chain and stale-version risk |

## P1 (next 1-2 sprints)

| Action | Status | Outcome |
|---|---|---|
| Upgrade safe patch/minor packages (`react`, `react-dom`, `next`, `tailwind`, `recharts`, etc.) | ✅ DONE 2026-03-28 | Better security/perf with low break risk |
| Validate and remove unused dependencies (`date-fns-tz`, `react-resizable`, checkbox pkg if unused) | ✅ DONE 2026-03-28 | Leaner bundle and lower maintenance |
| Tighten CSP in staged rollout | ✅ DONE 2026-03-29 — `proxy.ts` nonce-based CSP; `unsafe-eval` removed | Better web security posture |
| Reduce `any` in generation and settings hot paths | Pending — future sprint | Stronger type contracts |

## P2 (planned migration stream)

| Action | Outcome |
|---|---|
| Major upgrade track: `TypeScript 6`, `Vitest 4`, `eslint 10`, Vite plugin updates | Modern toolchain with controlled risk |
| Optional major UI ecosystem updates (`lucide-react` 1.x, `react-dropzone` 15) | Long-term maintainability |

---

## 6) What Is Best vs Waste (Direct Answer)

| Category | Best / Keep | Waste / Revisit |
|---|---|---|
| Architecture | BFF proxy + HttpOnly cookies + org-scoped routing | None (pattern is strong) |
| Security model | Allowlisted proxy + dual auth checks + security headers | CSP looseness (`unsafe-*`) |
| Domain libs | `pdf-lib`, `react-pdf`, `xlsx`, `jszip`, `qrcode` | None; domain-appropriate |
| UI stack | Radix + Tailwind + strict TS + testing stack | Potentially unused single packages (`react-checkbox`, `date-fns-tz`, `react-resizable`) |
| Tooling | Vitest + Playwright dual-layer testing | Missing explicit lint config deps and some major version lag |
| Operations | Retry/fallback logic already present | Logging/tracing/metrics maturity currently below enterprise standard |

---

## 7) Important Notes / Confidence

| Item | Confidence | Notes |
|---|---|---|
| Version drift table | High | Direct from `npm outdated` on current date |
| Unused dependency calls | Medium | `depcheck` can produce false positives in dynamic-import/Next environments |
| Enterprise architecture verdict | High | Verified from `proxy.ts`, API route handlers, client/server API layers, and org layout flow |
| “No code change” status | High | This audit adds documentation only |

