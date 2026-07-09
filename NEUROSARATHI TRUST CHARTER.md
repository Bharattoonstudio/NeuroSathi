# NeuroSarathi Trust Charter

Every AI coding assistant (Claude, GPT, Gemini, Copilot, Cursor, or any future
tool) and every human contributor must read this document before generating or
modifying code. This is the project's immutable contract. UI, backend, AI
models, and features can all evolve. This charter does not.

If there is ever a choice between making the product look smarter and being
completely honest with a parent, **NeuroSarathi always chooses honesty.**

---

## Principle 1: Truth Above Everything

- Never invent data.
- Never exaggerate certainty.
- Never hide uncertainty.
- Every insight must be traceable to real evidence stored in the database.
- If evidence is unavailable, say so explicitly: "We don't have enough
  information yet." Never estimate silently.

## Principle 2: Parents Before Algorithms

- Every feature must reduce stress, not create it.
- AI supports parents' judgment; it never replaces it.
- Every recommendation must be actionable and compassionate.

## Principle 3: Explain Every Insight

Every AI-generated insight must answer:
- What happened?
- Why are we showing this?
- What evidence supports it?
- What should the parent do next?
- How much data is this based on?

## Principle 4: Privacy Is a Product Feature

Parents should always be able to see:
- What data is stored
- When it was collected
- Who can access it
- How to delete it
- How AI uses it

Privacy does not live only in a legal document nobody reads.

## Principle 5: Every Screen Must Leave Parents Better Than Before

Every page should accomplish at least one of:
- Reduce anxiety
- Increase understanding
- Save time
- Celebrate real progress
- Encourage hope

If a screen does none of these, it shouldn't exist.

---

## Rule 11 — Every Feature Must Answer "Why?"

Before any feature is built, answer:
- Why does this help the child?
- Why does this help the parent?
- Why is AI required here (vs. a simpler static answer)?
- Why can't this be simpler?

If these don't have strong answers, the feature is not built.

---

## The Trust Review Checklist

Before any feature ships, it must pass every question below. If any answer is
"no," the feature isn't ready.

- [ ] Does it reduce anxiety, not create it?
- [ ] Is every claim backed by real, queryable evidence?
- [ ] Could a parent misread this as a medical diagnosis?
- [ ] Is uncertainty visible, not hidden?
- [ ] Is privacy obvious, not buried?
- [ ] Would a clinician approve the wording?
- [ ] Does this save the parent time or mental effort?
- [ ] Would the person building this show it to their own family?

---

## AI Output Levels (see AI_GUARDRAILS.md for full detail)

Every AI-facing surface in the product must self-classify into one of four
states, shown to the parent:

- **Evidence-Based** — based on this family's own logged data.
- **Educational** — general guidance applicable to many children, not
  personalized.
- **Observation** — a summary of a real pattern found in the data.
- **Needs More Information** — not enough data yet to personalize this.

No output should sound more certain than its actual state.

---

*This charter was written collaboratively with the product owner across an
extended product-design conversation. It reflects deliberate, repeated
agreement — not a default template.*
