---
name: code-review
description: Review new or modified code in BookingApp against this project's actual conventions (flat architecture, Angular standalone/zoneless/signals, ASP.NET Core controllers+EF Core directly, api-integration rules, Figma source-of-truth, thin test coverage). Use when the user asks to review a diff, PR, branch, or working-tree changes in this repo.
---

# BookingApp code review

Review changed code against conventions **already established in this repository** — don't invent stricter
standards, and don't flag a stylistic choice as a problem unless it conflicts with something the codebase already
does consistently. When unsure whether a pattern is established, check the reference files named below before
flagging it.

This is a learning project (see root `CLAUDE.md`): the bar is "consistent with existing conventions," not
"enterprise-grade." Don't recommend patterns the project has deliberately avoided.

## Before reviewing

Read `CLAUDE.md` (root) if it's not already in context — it's the canonical statement of this project's
architecture decisions and is updated as the project evolves, so treat it as more current than this skill's summary
of it. Also skim the diff itself to know which side(s) — frontend, backend, or both — are actually touched; skip
sections below that don't apply.

## Reference implementations

When judging whether new code "matches existing conventions," compare it against these known-good files rather than
reasoning from general Angular/ASP.NET Core best practices:

- `frontend/src/app/rooms/services/room.service.ts` — feature service shape, `environment.apiBaseUrl` usage, 404 handling.
- `frontend/src/app/rooms/components/room-form/room-form.component.ts` (+ `.html`) — signals for loading/error/not-found state, Reactive Forms + validators mirroring backend DataAnnotations, 409 handling.
- `frontend/src/app/rooms/components/room-list/room-list.component.ts` — signals for list/loading/error state.
- `backend/BookingApp.Api/Controllers/RoomsController.cs` — action-style routes, direct `AppDbContext` use, proactive conflict checks (409).
- `.claude/skills/api-integration/SKILL.md` — the full rationale behind the frontend↔backend rules below; read it if a finding needs more justification than this skill gives.

## 1. Project architecture

- Frontend and backend must both stay flat: controllers talk to `AppDbContext` directly, Angular components talk to
  one feature service directly. No intermediate layer either side.
- Flag any new Repository, Unit-of-Work, CQRS, MediatR, service-layer, NgRx/state-management library, HTTP
  interceptor pipeline, or generic `ApiService`/base-service abstraction — these are explicitly excluded by
  `CLAUDE.md` and `api-integration`, regardless of how idiomatic they'd be in a larger app.
- A single private `baseUrl` field or a small feature-scoped helper is fine; a cross-feature "shared HTTP layer" is not.

## 2. Angular

- **Standalone components only** — no `NgModule`. New components should have `imports: [...]` in the `@Component`
  decorator, not be declared in a module.
- **Folder structure**: each feature (`rooms/`, `bookings/`, `landing/`) owns its own `components/` (and
  `models/`/`services/` where relevant); features stay independent of each other. `shared/components` and
  `shared/models` are reserved for genuinely cross-feature code — flag a new component dropped directly under
  `shared/` if it's actually feature-specific, and flag cross-imports between feature folders.
- **Naming**: `<name>.component.ts/.html/.css`, `<name>.service.ts`, `<name>.model.ts`, matching the existing
  `room-list.component.ts`, `room.service.ts`, `room.model.ts` pattern.
- **HTTP calls live only in the feature's service** (`<feature>/services/<feature>.service.ts`) — flag any
  `HttpClient` injected directly into a component, or a URL built/concatenated outside a service.
- **No hardcoded backend URLs** — must read `environment.apiBaseUrl`. Flag any literal `http://localhost:5255` (or
  any other origin) outside the environment files.
- **Zoneless signals rule**: any component state set from inside an RxJS `.subscribe()` callback (or any other
  callback outside Angular's normal change detection) must be a `signal()` updated via `.set()`, not a plain class
  property. This is the single most important thing to check in any new/modified component — a plain-property bug
  here won't throw, it'll just silently fail to render. Flag it even if it "happens to work" in a quick manual test.
- **Reactive Forms convention**: `FormBuilder.nonNullable.group(...)`, validators mirroring the backend's
  DataAnnotations (`Validators.min`/`max` matching `[Range]`, `required` matching `[Required]`, etc.), inline
  `<p class="field-error">` shown only when a control is both `invalid` and `touched`. Flag a new form that uses a
  different validation-display pattern, a third-party form library, or validators that don't match the backend model.
- Model files (`*.model.ts`) should mirror the backend C# entity field-for-field (camelCase) and intentionally omit
  navigation properties the frontend doesn't need — flag a new frontend model that drifts from its backend
  counterpart, or a new parallel DTO-style type invented on the frontend where the backend has none.

## 3. ASP.NET Core

- **Controllers use `AppDbContext` directly** — no repository/service injected between them.
- **Routes are explicit and action-style** (`GetAllRooms`, `GetRoomById/{id}`, `CreateRoom`, `UpdateRoomById/{id}`,
  `DeleteRoomById/{id}` — see `RoomsController`/`BookingsController`), not plain resource-style REST
  (`GET /api/rooms/{id}`). Flag a new endpoint that breaks this naming convention, or a frontend call that assumes a
  resource-style URL instead of checking the controller.
- **Verify every route against the actual controller file**, don't assume a route exists because a similar one does
  on another controller — Bookings and Rooms controllers currently expose a different set of implemented methods
  (`BookingService` is still a stub even though `BookingsController` has real endpoints).
- Entities that double as API request/response bodies need non-nullable reference/collection properties initialized
  (`= new()`), matching the fix already applied to `Room.Bookings`/`Room.Amenities` — flag a new non-nullable
  navigation property without a default, since it will 400 every create/update request.
- `BookingStatus`-style enums must stay serialized as strings (`HasConversion<string>()` + `JsonStringEnumConverter`)
  — flag a new enum entity field that doesn't follow this.
- Check whether a new endpoint returning `.Include()`'d related entities needs the same back-reference-clearing
  workaround as `BookingsController.RemoveRoomBookingsBackReference` to avoid a serialization cycle.
- No repository/service-layer, no MediatR/CQRS — same rule as section 1, called out again because it's the most
  common thing a backend-focused change tries to introduce "for testability."

## 4. API integration

- Frontend service calls must match a route that actually exists on the corresponding controller — check both
  sides, don't take either one on faith.
- Request/response types must be the shared model (`Room`/`Booking`), not a new ad-hoc shape.
- **404** on a "get one" call should resolve to `undefined` (see `RoomService.getById`), not propagate as an error —
  flag a new `getById`-style method that doesn't follow this.
- **409** (e.g. duplicate room number) should map to a specific, short inline message, not a generic error banner.
- **400** in new code usually means a Reactive Forms validator has drifted from the backend's DataAnnotations — flag
  the mismatch itself, not just the symptom.
- Flag any feature that's supposed to be wired to the real API but still uses `of(...)`/canned mock data (this is the
  current known state of `BookingService` — don't flag that stub itself as a bug unless the task at hand was
  specifically to wire it up, in which case incomplete wiring *is* the finding).

## 5. UI / Figma

- Figma (file key `ScrUD5Gq1dFyXdeoPDE2Og`) is the source of truth for layout, spacing, typography, colors, and
  stated responsive behavior. For any UI-related change, check whether it matches the relevant frame rather than an
  invented or extended design — if you can't confirm the frame/node-id, say so rather than assuming the change is
  faithful.
- Flag UI elements, copy, or interactions added that aren't present in the Figma frame the change is supposedly
  implementing.
- Flag Figma-exported asset URLs committed/linked directly instead of downloaded and inlined locally (those URLs
  expire after ~7 days).
- A component not yet implemented from Figma is expected to still show a bare placeholder heading — don't flag that
  as incomplete unless the task was to implement that specific screen.

## 6. Tests and verification

- **Current baseline is thin**: only `app.component.spec.ts` (default scaffold) and `app.routes.spec.ts` (routing,
  via `RouterTestingHarness`) exist on the frontend; there is no backend test project at all. Calibrate findings to
  this baseline — don't demand a full test suite for a small change, but do check:
  - A new route added to `app.routes.ts` should get a corresponding case in `app.routes.spec.ts` (this is an
    explicit, established convention, not a general "add tests" suggestion).
  - A change to existing, already-tested behavior shouldn't silently reduce coverage (e.g. deleting/weakening a
    routing test case).
  - Obviously missing coverage for genuinely new logic (a new form validator, a new signal-driven state transition)
    is worth a **Suggestion**-level note, not higher, given the project's current baseline — unless the change
    touches code that already had tests, in which case missing updates to those tests is **Important**.
- Backend: since there's no test project, verification is "run the API and exercise it with curl/Swagger" per
  `CLAUDE.md` — check that the PR/change description shows this was actually done for new/changed endpoints, not
  that a test file exists.
- **Build check**: confirm (or ask for confirmation) that `dotnet build` (backend) and `npx ng build` /
  `npx ng test --watch=false` (frontend) succeed for the changed areas. Flag if this wasn't done and the change
  plausibly affects compilation (new imports, renamed symbols, changed signatures).

## 7. Scope

- Flag changes unrelated to the stated task — e.g. reformatting untouched files, renaming symbols not part of the
  request, adding abstractions "while I was in there," or touching a feature folder the task didn't call for.
- A bug fix or small feature shouldn't bring incidental refactors, new helper abstractions, or speculative
  generalization (per `CLAUDE.md`'s "don't add features/abstractions beyond what the task requires").

## 8. Documentation

- If the change introduces a new architecture decision, convention, workflow, tool, or API integration not already
  described in `CLAUDE.md`, flag that `CLAUDE.md` needs a corresponding update (this is an explicit standing
  instruction at the top of that file, not a general "update docs" nicety).
- If a change makes an existing `CLAUDE.md` statement inaccurate (e.g. wires up `BookingService`, adds a backend
  test project, changes a documented route or port), flag the specific stale sentence/section.

## Output format

Do not modify any files as part of a review.

Report findings grouped by severity:

- **Critical** — breaks functionality, violates a hard architectural rule (introduces an excluded layer, hardcodes
  a URL, mismatched route that will 404 in production, missing zoneless-signal state that silently fails to render).
- **Important** — inconsistent with established convention in a way that will confuse future work or cause a
  real (if not immediately crashing) bug — naming/folder drift, missing 404/409 handling, stale test coverage,
  scope creep, a `CLAUDE.md` update that's genuinely needed.
- **Suggestion** — minor, non-blocking improvement consistent with project conventions (e.g. a small missing test
  for new logic, given the project's current thin baseline).

For every finding, name the file and give a concise explanation of what's wrong and which convention it violates —
point at the reference implementation or CLAUDE.md/api-integration section it conflicts with.

If the reviewed changes follow the project's conventions, say so explicitly rather than inventing minor nitpicks —
an empty or near-empty finding list is a valid, complete review result.

Do not report a stylistic preference as a problem unless it conflicts with an established convention documented
above or demonstrated in the reference implementations.
