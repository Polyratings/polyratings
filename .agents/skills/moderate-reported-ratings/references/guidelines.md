# Polyratings Moderation Rubric

Decision rubric for triaging reported ratings. Source of truth for the user-facing policy is `packages/frontend/src/pages/FAQ.tsx` ("What are your guidelines regarding comments?").

## The Value Standard

Polyratings' sole criterion is **value to Cal Poly students**. Not words, not tone, not whether the professor is flattered.

> "We do not judge comments based upon the words they contain or the way they express their opinion, but if a comment is reported as inappropriate, we look to see what value it adds to both Polyratings and to Cal Poly students in general."

This means:

- Harsh language is allowed if the review is substantive.
- Calling the professor names is not allowed — it lacks value.
- Posting anything other than a comment about the professor (emails, test questions, replies to other reviews) lacks value.
- If in doubt, **err toward keeping** substantive student voice.

## Decision Matrix

| Pattern | Action | Example |
|---------|--------|---------|
| Balanced review with specifics (grading, workload, style) | KEEP | "Grades easy, no final, just essays. Lectures are monotone but content is dry." |
| Harsh but substantive (details effort, grade received, teaching flaws) | KEEP | "I attended every class, put effort in, got a 75. Feedback was delayed, emails unanswered." |
| Contrarian positive/negative in a consensus pile, with genuine detail | KEEP | "She's not that bad. Slow to grade and talks too long, but class is structured." |
| Pure name-calling / hate / venting only | REMOVE | "The absolute worst worst worst worst worst" |
| One-word or cryptic ("run.", inside jokes) | REMOVE | "run." / "just learned what 'all' meant. take this class" |
| Sarcasm with stars that contradict the text, no substance | REMOVE | "I wish you luck in learning absolutely nothing" + 4/4/4 |
| About appearance / personality quirks, not teaching | REMOVE | "dina and her bright neon orange cardigan against the world" |
| Identifies a specific third-party student's behavior | REMOVE | Narratives about another student's actions that could identify them |
| Confirmed duplicate (same anon, matching text, >1 rating) | REMOVE | Same author posts identical text under two course codes |
| Suspected professor self-review (see below) | INVESTIGATE → REMOVE if evidence | Stark positive outlier + community call-outs |
| Author requests own deletion | KEEP | FAQ: "any requests to edit or delete comments will be ignored." |
| Report reason is procedural only ("duplicate account", "wrong course") | KEEP | Not a content-based reason; doesn't affect the rating's value |
| Report reason is "fake"/"copy/paste"/"wrote this herself" | INVESTIGATE | See procedure below |

## Investigating "this is fake" reports

Reports alleging a review is fake, copy-paste, or a self-review need evidence, not vibes. A contrarian review isn't automatically fake.

### Evidence that supports REMOVE

1. **Duplicate text**: Same `anonymousIdentifier` posted the same or near-identical rating for the same professor under multiple course codes, often seconds apart.
2. **Explicit community call-outs**: Other reviewers (different anon IDs) independently name the suspect review as fake ("ignore the 5-star review", "she's writing the 4-star reviews herself").
3. **Claim contradiction**: The suspect review makes specific positive claims that independent reviewers specifically contradict (e.g., "office hours help a lot" when dozens of students report being dismissed or ignored in office hours).
4. **Rating/text mismatch inconsistent with sarcasm context**: e.g., max stars on a rating text that mocks the professor.

### Evidence that supports KEEP

1. The review acknowledges some of the common complaints (slow grading, boring lectures), suggesting a genuine student with a mixed experience.
2. No other reviewer has flagged it as suspect.
3. The claims are plausible within real student experience.
4. Only report is "sounds like the professor" — pure speculation.

### Tooling

- Use `polyratings_admin_get_ratings_by_anon_id` (admin) when deployed. Falls back to scanning `polyratings_get_professor_ratings` output for the `anonymousIdentifier` field.
- Use `polyratings_get_professor_ratings` to read all ratings on the professor and scan for call-outs and consensus pattern.

## Third-party student descriptions

A review may describe the reviewer's own experience with the professor (KEEP-eligible even with serious complaints). It may NOT narrate another student's alleged behavior in a way that identifies or could identify that student. This includes:

- Describing a named or narrowly-described student engaging in inappropriate behavior with the professor.
- Accusing another student of cheating, flirting, receiving favoritism, etc.

These are REMOVE regardless of how substantive the rest of the review is, because they expose a third party who had no opportunity to respond.

## Output format for presenting decisions

When presenting decisions to the user before acting:

```
### KEEP (N)
| # | Rating ID | Professor / Course | Rationale |
...

### REMOVE (N)
| # | Rating ID | Professor / Course | Rationale |
...
```

For each entry, also include the full rating text and each report reason so the user can verify before confirming destructive actions.

## Worked examples

**Example A — KEEP:** A 3/3/4 review of a widely-hated professor that says "Her class is well structured, expectations are clear. Slow to grade and talks too long, but otherwise fine." The rating acknowledges known flaws (slow grading, long lectures). No community call-outs. Report says "sounds like the professor." → KEEP: insufficient evidence to remove a potentially genuine contrarian review.

**Example B — REMOVE (self-review):** A 4/4/4 review of a professor with ~30 uniformly 0-star reviews, posted the same day another reviewer writes "She is writing the 4-star reviews for herself. RUN." The 4-star review specifically recommends office hours, which multiple other reviewers describe as hostile/dismissive. → REMOVE: community-flagged + claim contradiction + stark outlier.

**Example C — REMOVE (duplicate spam):** Same `anonymousIdentifier` posted identical text under "ENGL 145" and "AEPS 145" for the same professor 41 seconds apart. → REMOVE the reported copy via `polyratings_admin_remove_reported_rating`, then REMOVE the unreported twin via `polyratings_admin_remove_ratings_bulk` with an audit reason.

**Example D — REMOVE (third-party):** Review of Prof X describes how "a student currently enrolled in his class drops by a different section's lab to sit on his desk and flirt with him." Identifies a third-party student's behavior. → REMOVE regardless of other merits.

**Example E — KEEP (self-deletion):** A high-quality review where the original author asks for deletion because they posted under the wrong course code. FAQ: "any requests to edit or delete comments will be ignored." → KEEP; the tooling cannot re-tag the course, and policy doesn't permit deletion on author request.
