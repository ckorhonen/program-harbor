# Competition source log

Source date: 2026-08-08, America/New_York. The brief's export response did not expose a document `Last-Modified` value, so “current” below means the publicly retrievable version read on this date. The competition deadline is recorded in the source as Wednesday, August 12 at 10:00 PM Pacific, which is August 13 at 1:00 AM Eastern.

## Primary sources

| Source | Retrieval and evidence | Findings used |
|---|---|---|
| [Competition brief](https://docs.google.com/document/d/1rBHJtiNKHv4i43tdf2Rm0sDEYuIcajhmAPoBKR_Az-A/) | `curl -L '.../export?format=txt'` and `.../export?format=pdf` returned HTTP 200 on 2026-08-08. PDF title: `$10,0000 Kill My SaaS - Competition Brief`; 37 pages. Rendered pages 1–12 were inspected, including the visible strikethroughs and Sessionboard screenshots. | The customer wants the program/submission side of Sessionboard: event settings, submission forms, speaker portal, evaluation, agenda, communications, and public program surfaces. The brief says 1–6 are firm; Accelevents, resources/embeds, and embeddable gallery/schedule are shown as optional/bonus in the rendered version. Cloudflare, Airtable persistence, speed, API, and Forge are bonus preferences. |
| [Requirements walkthrough](https://youtu.be/vUuK4Knl7oc) | YouTube page metadata reported title `Kill my SaaS 1 Walkthrough / Briefing/Requirements`, 596 seconds, unlisted, uploaded 2026-08-07 23:58:43 -07:00. `yt-dlp --write-auto-subs --sub-langs en` downloaded the English captions; the complete caption file was read from `/tmp/kill-my-saas-walkthrough/vUuK4Knl7oc.en.vtt`. | The organizer emphasized a real customer workflow: configure an event, build a public application form, accept/review submissions, let submitters manage profiles and tasks, evaluate proposals, place accepted sessions on an agenda, communicate with speakers, and expose a public program. Product usefulness matters more than visual cloning; slow Sessionboard screens and lack of a self-guided demo are opportunities. AI review is explicitly optional in the walkthrough. |
| [Public CFP reference](https://appv2.sessionboard.com/submit/ai-engineer-sandbox-event/b7d4d7cd-3012-45c2-9c08-a8ee9185182f) | `npx playwright screenshot --device='Desktop Chrome' --wait-for-timeout=5000` succeeded on 2026-08-08. The screenshot showed a five-step flow—Welcome, Account, Submission, Participant, Review—a submission limit, event description, tracks, resource links, deadlines, and a Continue action. | The public experience should be a focused, progressive application flow with event context, submission limits, resources, and explicit review before submit. |
| [Sessionboard API introduction](https://sessionboard.mintlify.app/introduction) and [machine-readable docs](https://sessionboard.mintlify.app/llms.txt) | The Mintlify page returned HTTP 200. `llms.txt` and `llms-full.txt` were fetched on 2026-08-08. Relevant API pages cover event settings, custom fields, tracks, rooms, sessions/abstracts, agenda drafts, sessions files, OAuth, rate limits, and webhooks. | The replacement should have a stable resource-oriented API and keep its own domain model separate from external record shapes. Sessionboard models abstracts and sessions as a shared resource with `is_abstract`; agenda drafts support preview/commit; file flows include upload/finalize/security checks; search APIs use pagination. |
| [Competition Discord invite](https://discord.gg/XYXaapF4q) | Unauthenticated `curl -L` followed the invite to `https://discord.com/invite/XYXaapF4q` with HTTP 200. No authenticated pinned-message read was available, and no Discord mutation was attempted. | The invite is a source lead, not proof of an update. The written brief and pasted task remain the recorded requirements. |

## Interpretation

The pasted task supplied with this run is the operative implementation contract because it adds explicit acceptance scenarios, seeded-demo counts, security gates, test gates, artifacts, and a completion definition. When it goes beyond the brief, the requirements matrix marks the extra work as an internal P1/P2 target or a competition bonus rather than claiming that the brief made it mandatory. No organizer communication or competition-form submission was performed.

## Basic product-name collision check

`Program Harbor` was selected as the working product name. Exact web search for `"Program Harbor" event software` returned no competing product result on 2026-08-08; this is a lightweight collision check, not trademark clearance. The name describes a calm operational hub for a conference program and does not imply Sessionboard affiliation.

## Constraints and missing evidence

- No public competition update beyond the brief, walkthrough, and accessible invite was relied on.
- A public CFP can be inspected without credentials, but admin/evaluator/speaker behavior must be proven by our own browser evidence.
- Live Accelevents, Airtable, email, and object-storage credentials were not present in the inspected environment. A subsequent authorized change added an OpenNext Worker, D1 migration, and public demo deployment; the live provider and file-byte claims remain blocked until credentials and readback exist.
