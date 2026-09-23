# AI Usage — StayEase

This document records how AI assistance (Github Copilot Agent)
was used across the StayEase capstone — frontend, backend, testing, and
coverage — for the "Generative AI Usage" evaluation criterion. It's written
from the actual session/commit history, not reconstructed from memory, so
the examples below map directly to real commits in both repos.

**How the AI was used, in one line:** as a pair-programmer for diagnosis,
implementation, and testing — given a bug report, a requirement, or a
teammate's conflicting changes, and asked to find the root cause and fix it,
not just generate boilerplate from a blank prompt.

## Frontend

**Initial contract mismatch.** The frontend was originally built against an
imagined API shape. When wired to the real backend, most pages broke. The AI
was asked to diagnose *why* pages weren't loading, and traced it to several
independent issues rather than one: `types.ts` enums not matching the
backend's actual values, `services/api.ts` calling wrong paths/field names,
and two pages (`HotelDetail`, `MyStays`) stuck on infinite spinners because a
rejected fetch promise was never caught. Fixed by rewriting the API layer as
a translation layer (backend field names/casing → clean frontend types) and
adding proper error handling — see `af57ec5`, `6c509b4`, `0ebe295`, `9872767`.

**Bug fixes from user reports, root-caused rather than patched.** Several
rounds of "X is broken" reports were each traced to a specific cause before
fixing:
- *Manager Dashboard showed only one hotel* — traced to `.find()` picking
  the first matching hotel where `.filter()` was needed for a manager
  assigned to multiple hotels; added a hotel switcher (`1d2e043`).
- *Dates required again after "Browse more hotels"* and *dates lost through
  the login redirect* — the second one specifically was a malformed URL
  (`/login?next=/hotels/{id}?checkIn=...` — two `?`s, unencoded), not a
  missing feature; fixed by properly building the return URL with
  `URLSearchParams` + `encodeURIComponent` (`7adb2ed`, `f28e441`).
- *Room images not showing* — two stacked causes: no `onError` fallback, and
  the fallback image file itself was a corrupted 244-byte JPEG that couldn't
  even be opened (`b80ecdf`).
- *Hotels showing with no price when fully booked* — traced to the Browse
  page pricing hotels from their available-room count without excluding
  hotels with zero availability for the chosen dates.
- *Search caching across users* — the remembered search lived in
  `localStorage` with no clear-on-login/logout, so it leaked between users
  sharing a browser.

**Verification, not just generation.** For most of these fixes, the AI was
also asked to *prove* the fix worked rather than assert it — spinning up the
app with a local mock backend and driving it with Playwright (screenshotting
before/after states, checking specific DOM assertions) before calling a fix
done. This caught real issues before they shipped, including at least one
case where the AI's own first attempt at a fix was verified to still be
broken and was corrected before delivery.

**Design and cleanup requests.** Also used for: removing scaffolding that
shouldn't have shipped (a mock backend added only for local testing,
`ac1f2b9`; a leftover demo-accounts card and an unused dead-code seed file,
`2b5918e`, `f4e8f16`); reverting a change back to a prior state on request
(`f5c2d15`); and iterating on room images through several rounds of explicit
creative feedback (illustrated placeholders → real photo attempt → revert).

## Backend

**Reviewing a teammate's merge, not just writing new code.** After a
teammate merged conflicting changes into the branch, the AI was given the
merged zip and asked to reconcile it against the working version — file by
file, not wholesale acceptance. It identified that the merge had introduced
a second, parallel authentication stack (duplicate `SecurityConfig`,
`JwtService`, `JwtAuthenticationFilter` in a separate package) that would
prevent the app from starting, and a `@PreAuthorize("hasRole('CUSTOMER')")`
on `BookingController` that was a real bug (no `CUSTOMER` role exists — the
enum is `GUEST`/`MANAGER`/`ADMIN` — so it would have 403'd every booking).
The reconciliation kept the working stack, split `AuthService` into an
interface + `AuthServiceImpl` per an explicit request, and documented every
"kept vs. dropped" decision with reasoning (`acf9b96`).

**Authentication and authorization, explained and justified.** Implemented
stateless JWT auth (`JwtService`, `JwtAuthenticationFilter`,
`SecurityConfig`) plus a separate ownership layer (`AuthorizationService`)
so a guest can only touch their own bookings and a manager only their own
hotel's rooms — a check role-based rules alone can't express (`a8035ef`).
When asked to compare this against an alternative (`UserDetailsService`/
`AuthenticationManager`) design from the same merge, the AI gave a genuine
trade-off analysis (DB lookup per request vs. stateless; instant revocation
vs. short-lived tokens) rather than just picking one, and separately traced
the design back to the project's own requirement document once it was
provided, to confirm "stateless JWT... document trade-offs" was the
literal spec.

**Fixing gaps found by re-reading the requirement doc.** Given the actual
requirement PDF (scanned images, not text — read via page rendering), the AI
cross-checked the existing implementation against it and found concrete
gaps: three API endpoints in the doc's outline that weren't built yet
(`POST /auth/logout`, `GET /bookings/mine`, `PATCH /rooms/{id}/status`), and
added them; added `@PreAuthorize` role checks matching the doc's "check role
in controller" wording (with the *correct* roles, unlike the buggy merge);
and added a "why stateless JWT, and its trade-offs" section to the README
because the doc explicitly scores that as a documentation item (`3e3413f`).

**Fixing tooling, not just code.** When `mvn test` failed with "jacoco plugin
not found," the AI diagnosed it as JaCoCo being bound directly in `<build>`
(so any `mvn test` tried to resolve it, and failed if Maven Central was
unreachable) rather than a version problem, and moved it into an optional
`coverage` Maven profile so plain test runs never depend on it (`51e4cb5`).

**Scoping user-management design to the actual requirement.** When asked how
new managers/admins should be created, the AI laid out several designs
(seed-only vs. an admin-facing promote/create endpoint) with the security
trade-offs of each (an "admin creates admins" endpoint is privilege
escalation by design, even when role-gated), and implemented only what was
requested — seeding both an initial admin and an initial manager on startup,
idempotently, with no new endpoints — rather than defaulting to the more
"impressive" but unrequested option (`1f5e41b`).

## Testing & coverage

**Diagnosing coverage from the actual JaCoCo report, not guessing.** Given
the generated `index.html` coverage report, the AI read the real per-package
numbers (38% overall; `controller` and `mapper` at 0%, `exception` at 6%,
`security` at 41%) and targeted unit tests at exactly those gaps rather than
adding tests evenly or arbitrarily:
- **Controllers** (`AuthControllerTest`, `HotelControllerTest`,
  `RoomControllerTest`, `BookingControllerTest`,
  `HotelSearchControllerTest`) — plain Mockito tests per endpoint (status
  code, response body, delegation to the mocked service), deliberately not
  `@WebMvcTest`, so they don't pull in the security filter chain and stay
  fast and simple.
- **Mappers** (`MapperTest`) — exercises the MapStruct-generated `*Impl`
  classes directly, including nested-source mappings and null-handling that
  the generated code produces.
- **`GlobalExceptionHandler`** — all five exception mappings and the
  resulting JSON error shape.
- **`JwtService`** — generate→parse round-trip, and rejection of a garbage
  token, a token signed with a different key, and an expired token.
- Combined with the service-layer tests from an earlier round
  (`BookingServiceImplTest`, `RoomServiceImplTest`, `HotelServiceImplTest`,
  `AuthServiceImplTest`, `AuthorizationServiceTest`), which cover happy paths
  *and* validation/ownership branches (past dates, over-occupancy, double
  booking, wrong-user access) — not just the success case.

**Fixture design, not copy-pasted setup.** A shared `TestData` factory
class was written once so every test builds valid entities (`User`, `Hotel`,
`Room`, `Booking`) with sensible defaults and can override just the field
under test, instead of each test file duplicating object-construction
boilerplate.

## What the AI did *not* do unsupervised

- **Did not blindly accept a teammate's merged code** — it was reviewed
  file-by-file, with specific reasoning given for what was kept, dropped, or
  changed, including flagging a security bug (the fake `CUSTOMER` role) in
  someone else's contribution.
- **Did not invent scope** — when asked "how should managers be created,"
  it presented options and implemented only the one chosen, rather than
  building the more elaborate admin-panel version by default.
- **Did not claim untested code was verified.** Every response involving
  backend changes is explicit about one real constraint of the development
  environment: it could not run `mvn compile`/`mvn test` directly (the
  sandbox's network policy blocks Maven Central), so backend changes were
  checked by careful manual review — signatures, imports, brace/paren
  balance — and explicitly flagged as needing a local `mvn clean test` /
  `mvn verify -P coverage` run to confirm. Frontend changes, which *could*
  be run locally (Node/npm/Vite all work in-sandbox), were verified with
  real `tsc`/`vite build` runs and, for user-facing bugs, actual Playwright
  browser sessions against a local mock backend with before/after
  screenshots - not just asserted to work.

## Verifying this document

Every commit hash cited above exists in the two repos' `git log` and can be
inspected directly (`git show <hash>`) for the literal diff and full commit
message, which typically includes the reasoning, not just a summary of the
change.
