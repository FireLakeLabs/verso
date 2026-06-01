# Remaining Open Issue Order

This note assumes issue `#15` is already underway.

## Prompt coverage

Prompt files now exist for the remaining open implementation and coordination issues:

- `docs/agents/issue-6-agent-prompt.md`
- `docs/agents/issue-7-agent-prompt.md`
- `docs/agents/issue-8-agent-prompt.md`
- `docs/agents/issue-9-agent-prompt.md`
- `docs/agents/issue-10-agent-prompt.md`
- `docs/agents/issue-11-agent-prompt.md`
- `docs/agents/issue-12-agent-prompt.md`
- `docs/agents/issue-13-agent-prompt.md`
- `docs/agents/issue-14-agent-prompt.md`
- `docs/agents/issue-15-agent-prompt.md`
- `docs/agents/issue-16-agent-prompt.md`
- `docs/agents/issue-17-agent-prompt.md`

## Suggested order

1. `#17` Install Solid v1 agent harness guides and sensors.
   Keep this moving in parallel as coordination work. It should not block implementation starts, but it should keep the prompts, checklists, and sensor ownership aligned.

2. `#9` Add cover asset caching.
   This is the most useful next backend slice because issue `#15` depends on it and is already in flight. It is also relatively isolated compared with settings, Smart Shelves, or export.

3. `#8` Add Solid v1 settings.
   This settles authentication, refresh gating, Cost Basis settings, and app-shell preferences. It directly unblocks issue `#14` and reduces churn around shared settings DTOs.

4. `#6` Add Tags, Dropped marking, and bulk tagging.
   This stabilizes the first annotation-editing contracts in the Library Table and Item Detail, and it directly unblocks issue `#13`.

5. `#7` Add Library Health Check findings.
   This can run once issue `#5` exists and is largely independent of issues `#6`, `#8`, and `#9`. Keeping it separate from Smart Shelves reduces overlap in backend-authoritative rule and disposition logic.

6. `#10`, `#11`, and `#12` in parallel.
   These prompts already existed and the issues are blocked only by `#5`. They are good low-conflict UI/report lanes because the transforms can stay isolated per report module and route.

7. `#13` Add Smart Shelves manager and rules.
   Run this after issue `#6`. Smart Shelves depends on Tags and shares curation surfaces, so it is safer once tag semantics and mutation endpoints are already settled.

8. `#14` Add Cost-Per-Hour report.
   Run this after issue `#8`, because it depends on Cost Basis settings. The prompt already existed.

9. `#15` Add Cover Art Wall.
   This is already underway. Merge it after issue `#9` lands, because it depends on cached assets.

10. `#16` Add Archive and Projection Exports.
    Leave this for last. It is the cross-cutting integration slice and is explicitly blocked by `#6`, `#7`, `#8`, `#9`, and `#13`.

## Practical cutoff for low-conflict UI parallelism

If the goal is to let UI work proceed in parallel with a low chance of merge conflicts, the strongest backend-stable cutoff is:

- `#6`
- `#7`
- `#8`
- `#9`
- `#13`

After those land, most durable backend contracts for curation, settings, cached assets, and Smart Shelves are settled, while `#16` remains the intentional final integration slice.