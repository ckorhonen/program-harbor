# API guide

The machine-readable contract lives at [`/openapi.yaml`](../openapi.yaml), and the demo documentation surface is `/api/docs`. The app exposes a small event-scoped resource set under `/api/v1` and a public agenda endpoint. Private resources use the demo role guard locally and bearer auth in a production deployment.

All list responses use `data` plus `pagination` with `page`, `pageSize`, `total`, and `hasNext`. Validation errors return a generated `operationId` and never include secrets or private record fields. Public serializers omit email, internal notes, evaluator identity, task state, and private file metadata. The current local private guard is an environment-gated demo boundary, not bearer-token authentication; production auth remains a deployment prerequisite.

Example:

```bash
curl http://localhost:3000/api/v1/public/agenda
PROGRAM_HARBOR_DEMO_MODE=true curl http://localhost:3000/api/v1/sessions?page=1\&pageSize=25
```

The API smoke test must run against the actual started server. The deployed demo was read back at `https://program-harbor.sourcebottle.workers.dev` on Worker version `f5ea2b9c-178b-4198-ad73-d8e7d584e5ce`; that proves the demo surface, not production bearer authentication.
