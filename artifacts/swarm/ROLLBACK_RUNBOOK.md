# Rollback Runbook

Generated: 2026-02-13T13:33:15Z
Workspace: /Users/a002/DEV/xUSDT
Scope: `jins-projects-d67d72af`

## Trigger Conditions
- `/api/health` goes non-200 for a required app.
- Core journeys fail (landing/auth/payment/request/claim) after deploy.
- Elevated error rate or critical security regression is detected.

## Immediate Containment
1. Pause further production deploys.
2. Identify last known good deployment per project:
- `vercel list plasma-venmo --scope jins-projects-d67d72af`
- `vercel list plasma-predictions --scope jins-projects-d67d72af`
- `vercel list bill-split --scope jins-projects-d67d72af`

## Rollback Command
Run rollback using the deployment URL or ID from `vercel list`:
- `vercel rollback <DEPLOYMENT_URL_OR_ID> --scope jins-projects-d67d72af --yes`

Example:
- `vercel rollback plasma-venmo-<stable-id>-jins-projects-d67d72af.vercel.app --scope jins-projects-d67d72af --yes`

## Verify Rollback
After rollback, run:
1. `curl -i https://plasma-venmo.vercel.app`
2. `curl -i https://plasma-venmo.vercel.app/api/health`
3. `curl -i https://plasma-predictions.vercel.app`
4. `curl -i https://plasma-predictions.vercel.app/api/markets`
5. `curl -i "https://bill-split.vercel.app/api/bills?address=0x1234567890123456789012345678901234567890"`

## Post-Rollback Actions
1. Capture incident evidence in `/Users/a002/DEV/xUSDT/artifacts/swarm/POST_PROD_REVIEW.md`.
2. Open hardening branch and patch root cause.
3. Re-run full regression before next deploy attempt.
