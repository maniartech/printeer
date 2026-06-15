# BUG-041 — Remove the default CircleCI "hello world" stub

| | |
|---|---|
| **Severity** | Low (CI hygiene / red-noise) |
| **Area** | tests-quality / CI |
| **Status** | ✅ GREEN |
| **Removed** | `.circleci/config.yml` |

## Summary

`.circleci/config.yml` was the **default CircleCI scaffold from 2023** — a single
`say-hello` job that runs `echo Hello, World!` and **no tests**. The original
launch-readiness audit flagged it ("`.circleci/config.yml` is the default stub;
runs no tests"). It was also showing **red** in CircleCI on recent pushes — a
trivial `echo` job can't fail at the command level, so the failures were
CircleCI account/project-side (e.g. free-plan credits / project setup), producing
misleading red status unrelated to the code.

## Decision

The project's real CI is the **GitHub Actions** workflow (`.github/workflows/ci.yml`)
— lint / typecheck / build / unit / e2e (real Chromium) / pack across
**Node 20/22/24 × Windows + Linux**, green. A second, test-less CI system adds no
value and creates confusing red status, so the CircleCI stub was removed.

To stop CircleCI from running at all, the project should also be unfollowed /
disabled in the CircleCI web UI (a dashboard action, outside the repo).

## Learnings (carried forward)

1. **Delete generated CI scaffolds you don't use.** A hello-world stub that never
   runs tests is worse than no CI — it implies coverage that isn't there and goes
   red for account reasons no commit can fix.
2. **One canonical CI.** Pick the pipeline that actually gates quality (here GitHub
   Actions) and remove the rest.
