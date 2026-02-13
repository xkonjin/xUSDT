# BLOCKERS

Updated: 2026-02-13T13:33:15Z
Workspace: /Users/a002/DEV/xUSDT

## Blocker 1 - System Python Gate Fails
Status: BLOCKED

Missing item:
- `pytest` is not installed in system `python3` (`/opt/homebrew/opt/python@3.14/bin/python3.14`).

Exact command attempted:
- `cd /Users/a002/DEV/xUSDT && PYTHONPATH=. python3 -m pytest -q`

Exact error:
- `/opt/homebrew/opt/python@3.14/bin/python3.14: No module named pytest`

Exact next command(s) user must run:
1. `python3 -m pip install pytest`
2. `cd /Users/a002/DEV/xUSDT && PYTHONPATH=. python3 -m pytest -q`

What resumes automatically after unblock:
- Phase-4 python regression gate becomes green on the default interpreter path.

---

## Blocker 2 - Vercel Project Config Is Incompatible With Monorepo Workspace Builds
Status: BLOCKED

Missing item:
- Vercel projects are configured with `Node.js 24.x` and app-local root/install model that cannot resolve internal workspace packages (`@plasma-pay/*`).

Exact commands attempted and errors:
1. `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo && npx vercel --yes --scope jins-projects-d67d72af`
- Error: `The provided path "~/DEV/xUSDT/plasma-sdk/apps/plasma-venmo/plasma-sdk/apps/plasma-venmo" does not exist.`

2. `cd /Users/a002/DEV/xUSDT && npx vercel --yes --scope jins-projects-d67d72af`
- Deploy URL: `https://plasma-venmo-d93fn8j2g-jins-projects-d67d72af.vercel.app`
- Error in build logs: `Module not found: Can't resolve '@plasma-pay/share'` and `Can't resolve 'ethers'`

3. `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-predictions && npx vercel --yes --scope jins-projects-d67d72af --name plasma-predictions`
- Deploy URL: `https://plasma-predictions-mp612lj0c-jins-projects-d67d72af.vercel.app`
- Error in build logs: `npm ERR! 404 Not Found - @plasma-pay/core@*`

4. `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/bill-split && npx vercel --yes --scope jins-projects-d67d72af --name bill-split`
- Deploy URL: `https://bill-split-akkdhhzrb-jins-projects-d67d72af.vercel.app`
- Error in build logs: `npm ERR! 404 Not Found - @plasma-pay/aggregator@*`

Exact next command(s) user must run:
1. `open "https://vercel.com/jins-projects-d67d72af/plasma-venmo/settings"`
2. `open "https://vercel.com/jins-projects-d67d72af/plasma-predictions/settings"`
3. `open "https://vercel.com/jins-projects-d67d72af/bill-split/settings"`
4. In each project, set:
- Node.js Version: `20.x`
- Root Directory: `plasma-sdk`
- Install Command: `npm ci`
- Build Command:
  - venmo: `npm run build --workspace @plasma-pay/venmo`
  - predictions: `npm run build --workspace @plasma-pay/predictions`
  - bill-split: `npm run build --workspace @plasma-pay/bill-split`
5. Then run deploys from repo root:
- `cd /Users/a002/DEV/xUSDT && npx vercel link --yes --scope jins-projects-d67d72af --project plasma-venmo && npx vercel --yes --scope jins-projects-d67d72af && npx vercel --prod --yes --scope jins-projects-d67d72af`
- `cd /Users/a002/DEV/xUSDT && npx vercel link --yes --scope jins-projects-d67d72af --project plasma-predictions && npx vercel --yes --scope jins-projects-d67d72af && npx vercel --prod --yes --scope jins-projects-d67d72af`
- `cd /Users/a002/DEV/xUSDT && npx vercel link --yes --scope jins-projects-d67d72af --project bill-split && npx vercel --yes --scope jins-projects-d67d72af && npx vercel --prod --yes --scope jins-projects-d67d72af`

What resumes automatically after unblock:
- Phase-5 preview/canary then production deploy attempts for required apps.
- Phase-5/6 live smoke validation and post-production audit closure.

---

## Blocker 3 - Current Production Health Is Not Release-Ready
Status: BLOCKED

Missing item:
- Runtime production dependencies/config are not fully configured for venmo relayer path.

Exact commands attempted:
- `curl -i https://plasma-venmo.vercel.app/api/health`
- `curl -i https://plasma-venmo.vercel.app/api/relay`

Exact error signals:
- `/api/health` returns `503` with body containing `"status":"unhealthy"`
- `/api/relay` returns `503` with body `{"error":"Gasless relayer not configured"}`

Exact next command(s) user must run:
1. Configure required production env vars in Vercel project `plasma-venmo` (relayer secret, RPC, Redis/rate-limit vars).
2. Re-deploy venmo production:
- `cd /Users/a002/DEV/xUSDT && npx vercel link --yes --scope jins-projects-d67d72af --project plasma-venmo && npx vercel --prod --yes --scope jins-projects-d67d72af`
3. Re-validate health:
- `curl -i https://plasma-venmo.vercel.app/api/health`
- `curl -i https://plasma-venmo.vercel.app/api/relay`

What resumes automatically after unblock:
- Security go/no-go can be re-evaluated from NO-GO to GO if all required production endpoints are healthy.
