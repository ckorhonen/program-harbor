# Requirements ambiguities and decisions

## 1. Firm brief features versus the supplied execution contract

The rendered competition brief presents the first six program capabilities as the core ask and visually strikes through or footnotes Accelevents, resources/wiki, and embeddable gallery/schedule as optional or bonus. The supplied task separately labels Accelevents/API/Airtable/Cloudflare as P1 and resources/gallery/schedule as P2, while its definition of done asks for the complete seeded judge journey and a submission package. Decision: implement the supplied P0 contract first, then implement P1/P2 only after P0 evidence is passing; disclose any unverified external capability.

## 2. “Real-time” dashboard

The task requires a second browser context to reflect a speaker task completion within five seconds and remain correct after reload, but does not mandate a transport. Decision: use a durable state endpoint with short polling for the demo unless a simpler SSE/Cloudflare Workflow path proves more reliable. Polling is acceptable only if the E2E evidence measures the five-second requirement.

## 3. Authentication and demo role switching

The task requires secure portal access and also one-click demo access without production credentials. Decision: production-shaped role/session checks remain server-side; role-switch links are enabled only when an explicit demo-mode flag is set, show a visible non-production label, and are disabled by default in normal deployments. Invalid/expired portal tokens must fail closed.

## 4. Persistence adapter and deployment target

The task prefers Cloudflare and Airtable but does not provide credentials. Decision: domain logic uses a `StorageAdapter`; local/test uses deterministic file-backed persistence, Airtable is a credential-gated adapter, and a Cloudflare/D1 or equivalent adapter is selected only if it can be tested and deployed safely. A local adapter or emulator must never be described as a live Airtable/Accelevents test.

## 5. Files and object storage

The task requires private slides/supporting documents and R2 or equivalent object storage, but no object-storage credentials are present. Decision: implement an object-storage boundary with local private storage for tests/demo and signed/authorized download behavior. Live R2 status is a separate release-gate claim.

## 6. Email and calendar delivery

The task asks for templated messages, reminders, and valid invites, but authorizes sending only to `TEST_EMAIL_ALLOWLIST`; no allowlist or provider credentials are present. Decision: render and parse messages/ICS locally, record delivery attempts, and keep live send blocked until a provider, allowlist, and test recipient are configured. Google/Outlook URLs are generated, not evidence of delivery.

## 7. Accelevents contract

The brief names Accelevents but gives no public API contract or sandbox credential. Decision: define a narrow one-way adapter and faithful emulator with dry-run diffs, idempotency, error/retry state, and explicit `live verification: blocked` until a real sandbox target is authorized.

## 8. Deadline and currentness

The public export was retrieved on 2026-08-08 and says Wednesday Aug 12 at 10 PM PT. The public document did not expose a machine-readable last-modified timestamp. Decision: use the retrieval date and the explicit deadline in all release notes; do not infer newer Discord changes from an unauthenticated invite.

## 9. Product name

`Program Harbor` passed a basic exact web search for a competing event-program product on 2026-08-08. Decision: use it as the working name and avoid claiming trademark clearance.
