---
name: moderate-pending-professors
description: Review, approve, reject, dedupe, merge, and consolidate Polyratings pending professor submissions. USE WHEN the user says "moderate pending professors", "pending professor queue", "approve pending polyratings", "reject pending professor", "merge duplicate professors", "dedupe professors", "polyratings pending moderation", "submit under existing", or works through the Cal Poly verification + review-quality gate. Uses the Polyratings MCP admin tools; requires POLYRATINGS_ADMIN_TOKEN.
---

# Moderate Pending Polyratings Professors

Standard procedure for reviewing **pending** professor submissions, routing reviews to the **correct live profile**, and keeping live data clean (casing, ASCII-foldable names, department). Applies to human moderators and agents with admin access (site UI, tRPC, or MCP).

## Prerequisites

- Polyratings MCP server (`project-0-polyratings-polyratings` in this repo) configured with `POLYRATINGS_BACKEND_URL` and a valid `POLYRATINGS_ADMIN_TOKEN` — see `packages/mcp-server/README.md`.
- **Never commit** tokens or `.cursor/mcp.json` secrets. **Never ask the AI for credentials** — the moderator mints their own JWT via `packages/mcp-server/scripts/get-token.sh` and pastes it into the MCP env.

## Scope

- **Pending queue:** submissions before they appear publicly.
- **Live data:** professors in KV; merges, name/dept fixes, and submit-under flows all operate on the live store.
- **Out of scope:** reported ratings (use `moderate-reported-ratings`); bulk rating deletion, locks, anon-id investigations (separate admin tools).

## Principles

1. **Identity first.** Confirm a real Cal Poly instructor in the claimed department before approving.
2. **Review quality is a hard gate.** Approve only when **every** attached review is acceptable. Fixing department/name does not excuse bad reviews.
3. **No duplicate live rows.** Same person must not appear twice for the same normalized name + department.
4. **Never lose good reviews.** Prefer consolidation paths (submit-under, approve+merge) over rejection when a pending row is really a misnamed version of a live profile.
5. **ASCII-foldable live names.** The live fuzzy search does not match accents/diacritics, so live rows should use plain ASCII spellings (León → Leon). Pending rows follow the same rule at approve time.

## Workflow checklist

```
- [ ] 1. List pending (polyratings_admin_get_pending_professors)
- [ ] 2. Verify identity (Cal Poly directory / site:calpoly.edu)
- [ ] 3. Normalize: fix pending name casing + accents, fix pending department
- [ ] 4. Duplicate detection: live dup? pending dup? misattribution?
- [ ] 5. Review quality gate — every attached review must pass
- [ ] 6. Pick the right terminal action (approve / reject / submit-under / approve+merge)
- [ ] 7. If merging live profiles, re-confirm destId vs sourceId before the call
```

### 1. Verify identity (Cal Poly)

- Prefer **official Cal Poly sources**: directory (`directory.calpoly.edu`), department pages, catalog, `site:calpoly.edu <name> <department>`.
- Web search is supporting evidence, not a source of truth.
- **Name normalization is part of identity.** If the pending name is typo’d, lowercase, or uses accents/diacritics the live search can’t match, fix it with `polyratings_admin_change_pending_professor_name` **before** approve. Canonical spelling comes from the Cal Poly directory, not the submitter.

### 2. Review quality gate

`approvePendingProfessor` promotes the **entire** pending record — there is no per-review hide on approve.

**Approve when**

- Reviews are **good-faith student feedback**, including **critical** but **constructive** text (specific course/behavior, not insults only).
- Short but substantive reviews are fine.

**Reject when** (examples observed in past moderation rounds)

- Joke / meme / hoax text or "meme-speak" with no signal.
- Rants with no usable feedback (venting, slurs, harassment).
- **Subject rants** — complaints about the subject matter or the department rather than the instructor.
- **Non-student** or **fabricated** claims (e.g. author says they never took the class).
- Spam or empty fluff.

If **any** attached review fails the bar, reject the whole row (`polyratings_admin_reject_pending_professor`). Approving is all-or-nothing.

### 3. Duplicate detection & routing

Decide which of four scenarios applies *after* you've normalized name/dept on the pending row.

| Scenario | Correct terminal action |
|---|---|
| Pending is a **new, distinct** professor | Approve (`approve_pending_professor`) |
| Pending is a **misnamed / misattributed** version of an existing **live** professor (same person, same department, different spelling) | **Submit under existing** — `submit_pending_under_existing` with `destProfessorId` = live UUID. One call, re-homes all reviews, removes the pending row. |
| Pending + live duplicate where you want to **preserve original anonymousIdentifiers** and skip AI re-moderation | Approve pending → `merge_professors` (destId = live profile to keep, sourceId = newly approved UUID) |
| **Two pending rows** for the same person | Approve the **canonical** pending first → approve the duplicate pending → `merge_professors` (destId = canonical, sourceId = duplicate) |
| Pending is genuine spam / fails quality gate | Reject |

#### Submit-under vs approve+merge — when to pick which

Both paths end with the same visible result (reviews under one live profile, pending row gone), but they behave differently on the backend:

| | `submit_pending_under_existing` | `approve_pending_professor` + `merge_professors` |
|---|---|---|
| API calls | 1 MCP call (internally loops `ratings.add` then `rejectPendingProfessor`) | 2 MCP calls |
| Moderation | Re-runs AI moderation on every review | Does **not** re-run moderation |
| Rate limiting | Each review hits the public `addRating` rate limiter | Not rate-limited (admin path) |
| `anonymousIdentifier` | **Replaced** with a fresh server-assigned ID per review | **Preserved** from original submission |
| Partial failure | Pending row is **left in place**; inspect failures and retry or fall back to approve+merge | Pending row is already gone after approve; merge can’t fail halfway for the same reason |
| Creates transient live UUID | No | Yes (pending is promoted to a live row, then merged away) |
| Preferred when | Pending row is clearly a misnamed/misrouted version of a known live prof, reviews are plain text, small number of reviews | Preserving original submitter fingerprints matters, reviews risk re-moderation flags, or many reviews (to avoid rate limiting) |

> When in doubt: if any review looks borderline-moderation, prefer **approve + merge** so you don't have a review silently rejected during re-submission. Otherwise prefer **submit-under** for the single-call simplicity.

#### Live duplicates (two live rows already exist)

- **dest** = correct name/dept, usually **more** review history.
- `polyratings_admin_merge_professors({ destId, sourceId })`: all ratings from **source** merge into **dest**; **source** professor is **removed**.
- Do **not** rename the source to match dest before merging — the source row is deleted, its name is discarded. Renaming is wasted work.

### 4. Wrong department on pending

1. `polyratings_admin_change_pending_professor_dept` with the pending UUID and correct department (the canonical code list — same one the submission form uses).
2. Re-run identity + live-duplicate + review-quality checks under the new department.
3. Terminal action (approve / reject / submit-under / approve+merge) as usual.

### 5. Live data hygiene (name + department fixes on already-approved rows)

The fuzzy search on the live site does **not** match non-ASCII characters, and casing inconsistencies hurt search + look sloppy.

- `polyratings_admin_change_professor_name` — fix casing, typos, or ASCII-fold non-ASCII names on a **live** row.
- `polyratings_admin_change_professor_dept` — fix department on a live row.

When touching live names, confirm the canonical spelling with the Cal Poly directory first. A small number of Cal Poly instructors intentionally prefer all-lowercase stylings — honor those from the directory.

#### Audit pattern (when user asks for a site-wide name audit)

1. Pull all live professors via `getBulkKeys("professors")` + `getBulkValues(...)` (batches of ≤100).
2. Flag rows whose `firstName` or `lastName`:
   - contains non-ASCII characters (accents, diacritics, smart quotes), **or**
   - has mixed/lowercase casing not matching the directory, **or**
   - is missing / empty.
3. Confirm each proposed fix against the Cal Poly directory before calling the live name/dept mutations.
4. Apply fixes with `change_professor_name` / `change_professor_dept`. Keep a log of before/after in your report back to the user.

## MCP tools reference

All admin tools require `POLYRATINGS_ADMIN_TOKEN`. Tool names are capped at 60 characters by the MCP server prefix — hence `_dept` instead of `_department` on the longer ones.

### Pending queue

| Tool | Purpose |
|---|---|
| `polyratings_admin_get_pending_professors` | List pending rows |
| `polyratings_admin_change_pending_professor_name` | Fix first/last name on a pending row (casing, accent, typo) before a terminal action |
| `polyratings_admin_change_pending_professor_dept` | Fix department code on a pending row |
| `polyratings_admin_approve_pending_professor` | Promote a pending row (and all its reviews) to live |
| `polyratings_admin_reject_pending_professor` | Delete a pending row without promoting |
| `polyratings_admin_submit_pending_under_existing` | Re-submit every review on the pending row under a specified live professor, then reject the pending row. One-call alternative to approve+merge; re-runs moderation and replaces `anonymousIdentifier`. |

### Live store

| Tool | Purpose |
|---|---|
| `polyratings_admin_change_professor_name` | Fix first/last name on a live row (casing / ASCII fold) |
| `polyratings_admin_change_professor_dept` | Fix department on a live row |
| `polyratings_admin_merge_professors` | `destId` = keep, `sourceId` = merge in and delete |

### Read/inspect helpers

| Tool | Purpose |
|---|---|
| `polyratings_get_professor` / `polyratings_list_professors` | Confirm live IDs and names before destructive actions |
| `polyratings_admin_get_bulk_keys` + `polyratings_admin_get_bulk_values` | Site-wide audits (≤100 keys per values call) |

The admin UI and direct tRPC still work with the same JWT if you need a procedure not surfaced as an MCP tool.

## Common pitfalls & gotchas

- **Don't rename the source before a merge.** Source is deleted; its name doesn't survive. Waste of a call and confusing in the audit trail.
- **Don't approve + submit-under on the same row.** Submit-under expects a still-pending row (it calls reject internally). If you already approved, use merge instead.
- **Tool name length (≤60 chars).** If you're adding new MCP tools, keep names short. This is why `change_pending_professor_department` was renamed to `change_pending_professor_dept`.
- **`anonymousIdentifier` semantics.** Preserved by `merge_professors`, replaced by `submit_pending_under_existing`. Matters if you're investigating spam clusters by fingerprint after the fact.
- **ASCII-fold live names.** Live fuzzy search doesn't match accents. Submitter entered "Ricardo Vega León"? Approve/normalize as "Ricardo Vega Leon" to keep search working.
- **Misattribution vs distinct-person.** If two pending rows (or a pending + live) share a last name and department but differ in first name, check reviews for course numbers, quarters, and student-referenced behavior before concluding misattribution. Corroborating detail from multiple reviews is what elevates a guess to a merge.
- **Subject rants ≠ instructor feedback.** Reviews that complain about the course topic / department in general, with no instructor-specific signal, should be rejected.
- **Approve is irreversible** from the pending side (the pending row is gone). **Merge is irreversible** from the live side (source is deleted and its ratings are duplicated onto dest). Always re-read `destId` / `sourceId` before submitting.

## Pre-approve checklist

- [ ] Cal Poly (or official) evidence matches name + role.
- [ ] Department is correct (fix pending-dept if not).
- [ ] Name is canonical (casing + ASCII-folded); fix pending-name if not.
- [ ] No unintended live duplicate for same normalized name + department.
- [ ] Every attached review passes the publication bar.
- [ ] If consolidating with a live profile: picked the right path (submit-under vs approve+merge) and confirmed destination ID.

## Maintenance

Update this skill when:
- Backend adds per-pending-rating moderation (so partial approves become possible).
- A new terminal-action MCP tool is added (and update the decision table above).
- Fuzzy search gains accent-insensitive matching (ASCII-fold rule becomes optional, not mandatory).
