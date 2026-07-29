# Plan: Organic RDD Git Awareness

## Approach

Use local `git` CLI calls from the Node standard library via `execFileSync`. Treat Git metadata as advisory unless `strict_manifest` is explicitly requested at gate time.

## Changes

- Add Git inspection helpers to `lib/organic-rdd.js`.
- Extend receipt schema with `git` and `manifest_warnings`.
- Recompute manifest completeness in `status` and `gate`.
- Add `strict_manifest` boolean to `review_gate` plugin tool.
- Update `commands/review-start.md`, `commands/review-gate.md`, and README limitations.
- Add focused tests using temporary Git repositories.

## Verification

- `node --test tests/*.test.js`
- `node --check lib/organic-rdd.js && node --check plugins/organic-rdd.js`
- `bash -n install.sh`
- `git diff --check`
- `opencode debug config`
