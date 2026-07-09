# Privacy Framework

Privacy is a product feature, not a paragraph in a legal document. This file
describes the intended framework — and honestly marks what is currently built
versus what is still aspirational, per this project's own Trust Charter
(we don't overstate our own documentation any more than we'd overstate a
product claim to a parent).

## What parents should always be able to see
- What data is stored about their family
- When each piece of data was collected
- Who can access it (currently: only the account owner, via Supabase Row
  Level Security)
- How to delete it
- How, if at all, AI has used it

## Current implementation status

| Capability | Status |
|---|---|
| Account data stored via Supabase Auth (email, password, name) | ✅ Implemented |
| Screening results tied to user account | ✅ Implemented |
| Children profiles, routines tied to user account | ✅ Implemented |
| Row-level data isolation (users only see their own data) | ⚠️ Depends on Supabase RLS policies being configured — verify these are turned on for every table |
| A visible in-app "Your Data" page (view/export/delete) | ❌ Not yet built |
| Explicit log of "what AI looked at" per insight | ⚠️ Partially implemented — evidence is shown per-card, but no persistent audit log exists yet |
| Data deletion self-service (not via support request) | ❌ Not yet built |
| Written privacy policy page | ❌ Not yet built — needed before public launch |

## Non-negotiables before public launch
1. Confirm Row Level Security is enabled on every Supabase table storing
   family data — without this, the "who can access it" answer is not
   actually true.
2. Build a real, simple privacy policy page and link it from the footer.
3. Provide at least an email-based way for a parent to request deletion of
   all their data, until self-service deletion is built.

## Principle
If this document ever says something is implemented that isn't actually
true in the live product, that is itself a Trust Charter violation. Update
this table whenever privacy-related work ships or changes.
