## Agent skills

### Issue tracker

Issues live in GitHub Issues at FireLakeLabs/verso. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Harness

Solid v1 work should use the guide/sensor timing in `docs/agents/harness.md`. Each implementation issue should add the guides and sensors assigned to it, and should not be considered done until its relevant harness pieces are in place.

### Development workflow

Use the `tdd` skill for implementation work unless the issue explicitly says it is documentation-only or otherwise unsuitable for test-first development. Use the `review` skill for review passes before an implementation issue is considered ready to merge or close, and do not report implementation work as done until a PR is opened and ready for review. See `docs/agents/development-workflow.md`.

### Definition of Done

Implementation issues must satisfy `docs/agents/definition-of-done.md` before they are considered complete.
