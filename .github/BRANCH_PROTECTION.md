# Branch Protection Rules

To prevent merging PRs with deployment errors, configure the following branch protection rules for the `main` branch:

## Required Settings

1. **Go to**: Repository Settings > Branches > Add branch protection rule

2. **Branch name pattern**: `main`

3. **Enable these protections**:
   - [x] Require a pull request before merging
   - [x] Require status checks to pass before merging
   - [x] Require branches to be up to date before merging

4. **Required status checks**:
   - `Build Plasma Venmo (Plenmo)`
   - `Build Smart Contracts`

5. **Additional recommended settings**:
   - [x] Require conversation resolution before merging
   - [x] Do not allow bypassing the above settings

## Vercel Integration

The Vercel GitHub integration should also be configured to:
1. Run preview deployments on PRs
2. Block merging if preview deployment fails

To configure:
1. Go to Vercel Dashboard > Project Settings > Git
2. Enable "Preview Deployments"
3. Set "Production Branch" to `main`

## Why This Matters

Without these protections, PRs can be merged even when:
- TypeScript compilation fails
- Next.js build fails
- Vercel deployment fails

This leads to broken production deployments and requires manual intervention to fix.
