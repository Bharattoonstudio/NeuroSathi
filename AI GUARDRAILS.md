# AI Guardrails

Technical rules for anyone (human or AI assistant) implementing AI-facing or
data-driven features in NeuroSarathi. Read alongside NEUROSARATHI_TRUST_CHARTER.md.

## The Golden Rule

Never fabricate certainty. When data is limited, say so. When evidence is
mixed, explain it. When the system doesn't know, admit it. Parents will
forgive uncertainty. They will not forgive false confidence.

## Output Levels

Every AI-generated or data-derived statement shown to a parent must be
classifiable as exactly one of these four states, and the UI should make the
state visible:

| State | Meaning | Example |
|---|---|---|
| Evidence-Based | Derived from this specific family's logged data | "You've completed 5 of the last 7 days." |
| Educational | General guidance, not personalized | "Routines help many children feel secure." |
| Observation | A real pattern found in the data | "Communication activities are completed more often than sensory ones." |
| Needs More Information | Not enough data to say anything personalized | "Log a few more days to unlock this." |

Never blend these without labeling — e.g. don't follow a real evidence-based
sentence with an invented educational-sounding one that implies it's also
personalized.

## Three Levels of AI Output Complexity

**Level 1 — Educational.** Static, pre-written content (what is autism, why
routines help, sleep hygiene basics). No validation required beyond normal
editorial review.

**Level 2 — Personalized.** Today's Priority, routine reminders, progress
summaries. Must always show its evidence and reasoning. Built from real
queries against the family's own data.

**Level 3 — Clinical-adjacent.** Regression detection, developmental concern
flags, screening interpretation, escalation suggestions. These do not ship
until:
- Backed by sufficient longitudinal data (not a handful of days)
- Reviewed against clinician-approved guidance
- Always accompanied by explicit limitations
- Never presented as, or near, a diagnosis

As of this writing, NeuroSarathi has shipped Level 1 and Level 2 features
only. Level 3 is explicitly out of scope until a clinical review process
exists.

## Data Quality Indicator

Never show a calculated confidence percentage (e.g. "87% confidence") unless
it comes from a validated statistical model reviewed for this purpose — which
does not currently exist in this product. Instead, use a plain data-quality
signal derived from a literal count:

- 🟢 **Data Available** — meaningful history logged (e.g. 20+ days)
- 🟡 **Growing Understanding** — some history, still early (e.g. 3–19 days)
- 🔴 **Just Getting Started** — 0–2 days logged

Always show the literal count alongside the color, e.g. "🟡 6 days logged."

## Every Recommendation Follows One Template

```
Recommendation — the one simple action
Why — evidence from this family's real data
What we looked at — which specific data sources were used
How reliable is this — data quality indicator
What's next — one clear next step
```

## Forbidden Patterns

- Calculated probability/confidence percentages without a real model behind them
- Predicted future dates or milestones ("expected in 3–6 months")
- Any language implying the AI diagnosed something
- Praise or encouragement not tied to a real, checkable fact
- Silent estimation when data is missing — always say "not enough data yet"
