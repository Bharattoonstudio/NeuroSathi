# Clinical Boundaries

NeuroSarathi does not diagnose. This document defines exactly what the
platform does and does not do, and must be respected by every feature.

## What NeuroSarathi does
- Supports parents with organization, routines, and reminders
- Educates using general, well-established developmental guidance
- Guides parents toward relevant next steps (e.g. "consider a professional
  screening")
- Tracks what the family logs — activities, milestones, screening results
- Explains patterns found in that family's own real data, transparently

## What NeuroSarathi never does
- Diagnose autism, ADHD, or any other condition
- Claim to replace a doctor, psychologist, therapist, or clinical assessment
- Present a screening result as a medical conclusion (screening tools in this
  product are educational indicators only — this must be stated on every
  screening result screen)
- Suggest medication changes, dosages, or clinical treatment plans
- Use diagnostic language ("regression," "developmental delay confirmed") in
  any parent-facing copy

## Screening tests specifically
Every screening test result must:
- State clearly it is an educational indicator, not a diagnosis
- Recommend professional consultation for any concerning result, without
  alarming language
- Never be phrased as a percentage risk or clinical probability

## Escalation language
When a result suggests the family should see a professional, use calm,
practical framing:

Good: "A few of your answers suggest it could help to talk with a
developmental pediatrician or speech therapist."

Avoid: "High risk detected" / "Your child shows signs of..."

## The Level 3 gate (see AI_GUARDRAILS.md)
Any feature that could be read as a clinical judgment (regression detection,
developmental concern scoring, therapy recommendations) is Level 3 and does
not ship until:
1. Sufficient longitudinal data exists to support it
2. It has been reviewed against clinician-approved guidance
3. Limitations are clearly and permanently visible alongside the output
4. It is never labeled or implied to be a diagnosis

As of this document, no Level 3 feature has been built or approved.
