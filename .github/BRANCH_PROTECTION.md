# Branch Protection Rules

## Required Configuration for `main` Branch

To prevent deployment failures, configure the following branch protection rules in GitHub:

### Settings > Branches > Add Rule

**Branch name pattern**: `main`

### Protection Rules

1. **Require a pull request before merging**
   - [x] Require approvals: 1
   - [x] Dismiss stale pull request approvals when new commits are pushed
   - [x] Require review from Code Owners (optional)

2. **Require status checks to pass before merging**
   - [x] Require branches to be up to date before merging
   - Required status checks:
     - `Build Plasma Venmo (Plenmo)`
     - `Lint`
     - `Test`
     - `Dependency Audit`

3. **Require conversation resolution before merging**
   - [x] Enabled

4. **Do not allow bypassing the above settings**
   - [x] Enabled (recommended for production)

### Vercel Integration

Vercel automatically creates deployment status checks. Ensure these are also required:
- `Vercel - plasma-venmo`

## Setup Instructions

1. Go to repository Settings > Branches
2. Click "Add branch protection rule"
3. Enter `main` as the branch name pattern
4. Configure the settings above
5. Click "Create" or "Save changes"

## Verification

After setup, any PR to `main` will require:
1. Passing build check
2. Passing lint check
3. Passing tests
4. Successful Vercel preview deployment
5. At least 1 approval (if configured)

This prevents merging code that would break the production deployment.

## Why This Matters

Without these protections, PRs can be merged even when:
- TypeScript compilation fails
- Next.js build fails
- Vercel deployment fails
- Security vulnerabilities exist

This leads to broken production deployments and requires manual intervention to fix.
