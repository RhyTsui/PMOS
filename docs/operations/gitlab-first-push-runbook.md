# GitLab First Push Runbook

- status: active
- date: 2026-05-12
- scope: new PMOS repo bootstrap and first push

## Goal

Provide a minimal, repeatable first-push flow for a new PMOS repository that has already been generated locally.

Current target remote:

- `http://gitlab.sh.com/xuyun/pmos.git`

## Recommended Flow

Run in the new local project root:

```bash
git init
git branch -M main
git remote add origin http://gitlab.sh.com/xuyun/pmos.git
git add .
git commit -m "feat: initialize PMOS frontend kit"
git push -u origin main
```

## If Remote Already Exists

Use:

```bash
git remote set-url origin http://gitlab.sh.com/xuyun/pmos.git
git remote -v
```

Then continue:

```bash
git add .
git commit -m "feat: initialize PMOS frontend kit"
git push -u origin main
```

## Before First Push

Prefer to complete these checks first:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pmos:verify
```

Interpretation in PMOS role terms:

- `Fullstack Builder Agent` prepares the runnable repo
- `Testing Acceptance Agent` must clear the local gate before first push

Do not treat "code exists locally" as enough for first publication.

If any check fails, fix before the first push unless the failure is clearly caused by environment or network restrictions.

## Expected Blocking Point

The most common real blocker is GitLab authentication.

If `git push` fails because credentials are missing or rejected:

- do not treat the repository as published
- record that local initialization succeeded
- report the exact push blocker

## Scope Rule

This runbook is for:

- new repository bootstrap
- first commit
- first push

It is not the default release runbook for later feature branches or protected-branch workflows.
