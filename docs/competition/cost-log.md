# Competition cost log

## Scope

The packet contains a live Cloudflare demo deployment but no billing receipt or usage readback. This log records the deployment scope without converting unknown spend into `$0`.

## Recorded costs

| Cost area | Evidence available | Amount | Status |
| --- | --- | --- | --- |
| Local development | Local app, Bun, and repository files only | Not recorded | NO COST EVIDENCE |
| Deployment | Cloudflare Worker + D1 demo at `program-harbor.sourcebottle.workers.dev`; no billing or usage receipt | Not recorded | DEPLOYED; COST UNVERIFIED |
| Email delivery | No provider credential or delivery receipt | Not recorded | BLOCKED |
| Airtable | No credential, base, or readback | Not recorded | BLOCKED |
| Accelevents | No credential, target event, or sync readback | Not recorded | BLOCKED |
| R2/object storage | No credential, bucket, or object readback | Not recorded | BLOCKED |

## Accounting rule

Do not publish a total, price, usage metric, or savings claim until the source receipt and scope are recorded. Local emulator or file-adapter behavior is not a provider cost receipt.
