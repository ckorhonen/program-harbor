# Performance report

## Status

Local performance sampling is `RECORDED`; deployment performance remains `BLOCKED`. `bun run measure:local` ran 3 warm Chromium navigation samples for six routes against the local production server. The final observed median `responseEnd` values were 5 ms (`/`), 6 ms (`/admin`), 7 ms (`/cfp`), 2 ms (`/schedule`), 2 ms (`/portal`), and 5 ms (`/api/docs`); these are local process timings, not user-perceived load times or a load-test result.

The competition source log identifies speed as a bonus preference. That source-backed preference does not establish a measured result for this local app.

## Evidence matrix

| Area | Evidence in packet | Status |
| --- | --- | --- |
| Local warm navigation | `bun run measure:local`, 3 samples/route | RECORDED, indicative only |
| Public or deployed response time | No deployment or URL readback | BLOCKED |
| API latency or throughput | None supplied | UNVERIFIED |
| Browser resource or bundle measurement | Not measured | UNVERIFIED |
| Storage performance | Local JSON target only; no benchmark | UNVERIFIED |

The browser E2E result is functional evidence and does not provide a performance metric. Do not infer a speed score from it or from the warm local navigation sample.

## Local starting point

The app can be started locally with:

```bash
bun run dev
```

Any future benchmark must record the command, route or workload, environment, sample scope, and raw result. A deployed performance claim additionally requires a real deployment URL and post-deploy readback; neither is available in this packet.
