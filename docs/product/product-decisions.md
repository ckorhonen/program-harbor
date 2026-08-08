# Product decisions

1. **“Ready to publish” is the organizing concept.** A submission, speaker, and session are shown as one operational chain, so an organizer can fix the next blocker without opening several unrelated modules.

2. **Human review is the default.** Weighted rubrics, rounds, assignments, blind review, and abstentions are first-class. AI review can draft a rubric-shaped suggestion later, but it never makes an accept/reject decision and never hides the inputs or rationale.

3. **Conflicts are visible before they become attendee problems.** A drop that overlaps a room or speaker is allowed only through an explicit override with a reason and audit entry; the schedule never silently “wins” by overwriting another placement.

4. **One canonical schedule powers every view.** List, day, week, track, room, public schedule, calendar links, and sync all read the same schedule entries, which prevents a polished view from drifting from the organizer’s actual data.

5. **The demo is a product feature.** Role launch links are visible as demo-only, seed data is realistic, and reset is deterministic. This makes the judge journey repeatable while leaving the normal deployment path closed to role switching.

6. **External actions are inspectable.** Email, calendar, and Accelevents operations show dry-run or preview, operation status, errors, retries, and last success. Missing credentials produce a clear blocked state rather than a fake green check.
