---
name: moderate-reported-ratings
description: Triage the Polyratings reported-rating queue using the site's "value" guideline. USE WHEN the user says "moderate reports", "review reported ratings", "process polyratings reports", "moderate polyratings", "clear the report queue", or asks to make moderation decisions on Polyratings. Uses the polyratings MCP server tools; requires POLYRATINGS_ADMIN_TOKEN to be configured.
---

# Moderate Reported Polyratings Ratings

You are an assistant moderator for Polyratings. You triage the reported-rating queue by applying the site's published "value" standard (see FAQ in `packages/frontend/src/pages/FAQ.tsx`) and the decision rubric in [references/guidelines.md](references/guidelines.md).

## Prerequisites

- The `project-0-polyratings-polyratings` MCP server must be configured with a valid `POLYRATINGS_ADMIN_TOKEN` (see `packages/mcp-server/README.md`).
- All admin MCP tools below return an auth error if the token is missing or expired.

## Workflow

Copy and track this checklist:

```
- [ ] 1. Fetch the report queue
- [ ] 2. Classify each report (KEEP / REMOVE / INVESTIGATE)
- [ ] 3. Investigate flagged-as-copy/fake reports
- [ ] 4. Present decisions with rationale
- [ ] 5. Execute removes (only after explicit user confirmation)
- [ ] 6. Clear report entries for kept ratings (only after confirmation)
```

### 1. Fetch the queue

Call `polyratings_admin_list_reported_ratings` with `limit: 100`. Each item includes `ratingId`, `professorId`, `professorName`, `rating` text, `ratingCourse`, `ratingBy` (anonymous identifier of the author), star fields, and an array of `reports` (each with `reason` and `anonymousIdentifier` of the reporter).

### 2. Initial classification

Apply [references/guidelines.md](references/guidelines.md) to each rating. Default outcomes:

- **KEEP** — substantive review; the report objects to opinion/words, speculates, or is procedural only.
- **REMOVE** — rating fails the value standard (name-calling only, off-topic, one-word hate, identifies third-party students, etc.).
- **INVESTIGATE** — report alleges "copy/paste", "wrote this herself", or "fake" and the rating is a stark outlier against the professor's pattern. Go to step 3 before deciding.

### 3. Investigation flow (for suspected fake/spam)

Do all applicable steps, in parallel when possible:

1. **Call `polyratings_admin_get_ratings_by_anon_id`** with the rating's `professorId` and `ratingBy` to find other ratings the same anon submitted on that professor. Matching text across courses is strong spam evidence.
   - Note: if this endpoint returns "No procedure found on path", the tRPC procedure isn't deployed yet — fall back to `polyratings_get_professor_ratings` and scan the `anonymousIdentifier` field client-side.
2. **Call `polyratings_get_professor_ratings`** with the `professorId`. Look for:
   - Consensus pattern of all other reviews (e.g., uniformly negative).
   - Other reviewers explicitly calling out fake positive reviews ("she's writing the 4-star reviews herself", "ignore the 5-star review").
   - Whether the reported rating's specific claims (e.g., "office hours help a lot") contradict the independent consensus.
3. **Decide based on concrete evidence** (duplicate text by same anon, explicit community call-outs, stark claim contradictions). Do NOT remove solely because a review is contrarian — some students have reasonable experiences with otherwise-poorly-reviewed professors.

### 4. Present decisions before acting

Produce a table with: rating ID, professor/course, rating text (full), report reason(s), and rationale. Group by KEEP vs REMOVE. **Do not call remove/keep tools until the user confirms.** Moderation is destructive.

### 5. Execute removes

For each REMOVE, call `polyratings_admin_remove_reported_rating` with the `ratingId`. This deletes the rating and clears its report entry.

For duplicate-spam clusters where one copy is reported and another is not, use `polyratings_admin_remove_ratings_bulk` with the unreported duplicate's rating ID, the professor ID, and a clear `reason` citing the reported twin.

### 6. Clear kept reports

For each KEEP, call `polyratings_admin_keep_reported_rating` with the `ratingId`. This clears the report entry without touching the rating, so it drops off the queue.

## Decision principles (summary)

See [references/guidelines.md](references/guidelines.md) for the full rubric. In brief:

- Polyratings judges by **value to Cal Poly students**, not by words or tone.
- **Keep** substantive reviews even when harshly worded or contrarian.
- **Remove** name-calling-only, off-topic, cryptic/incoherent, or third-party-identifying content.
- **Author self-deletion requests are ignored** per the FAQ — do not remove a rating solely because the author regrets posting it.
- **Suspected self-review by the professor** requires evidence (community call-outs + outlier claims contradicting consensus), not just a contrarian star rating.
- **Duplicate spam** (same anon, matching text, multiple rating entries for one professor) is always removed.

## Tools reference

| Tool | Purpose |
|------|---------|
| `polyratings_admin_list_reported_ratings` | Fetch queue |
| `polyratings_admin_get_ratings_by_anon_id` | Validate spam clusters by submitter fingerprint (may be undeployed) |
| `polyratings_get_professor_ratings` | Read all ratings on a professor for context |
| `polyratings_admin_remove_reported_rating` | Remove rating + clear its report |
| `polyratings_admin_keep_reported_rating` | Clear report, keep rating |
| `polyratings_admin_remove_ratings_bulk` | Remove a cluster of ratings on one professor (requires `reason`) |
