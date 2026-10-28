---
name: speclane
description: Run a resumable, OpenSpec-driven development workflow from requirement clarification through implementation, tests, review, and delivery. Use for new projects, feature changes, or extensions when the user wants SpecLane, staged approval, quality gates, or interruption recovery.
---

# SpecLane

Own the workflow. Other skills provide capabilities; they never advance SpecLane state.

## Start or resume

1. For a project that has not been prepared, use the user-facing `SpecLane init <project>` CLI; do not ask the user to run `openspec init` directly.
2. Run `node scripts/speclane.mjs preflight --available-skills=<comma-separated host skill names>` from this skill directory. The preflight also checks the installed `grill-with-docs` file because its upstream metadata deliberately hides it from the host list. Missing Node, OpenSpec, OCR Delegation Mode, or a fixed external Skill is `BLOCKED`; never install global dependencies without approval outside the explicitly invoked `SpecLane init` command.
3. Find or create `.auto-dev/runs/<run-id>/state.json` in the target project. New runs default to `fast`; every run has state, including small changes.
4. On resume, run `state resume --change <change-path>`, recompute the plan hash, inspect the working tree and validate the current step's evidence before retrying anything.
5. Never replay an external write, migration, or deployment merely because a local step says `running`; verify the external state or require an idempotency mechanism.

Read [references/workflow.md](references/workflow.md) for phase routing and [references/state.md](references/state.md) when creating, updating, or recovering state.

## Workflow profile

- `fast` is the default. Load only the current phase reference, keep artifacts and evidence concise, and reuse already-read review scope, diffs, and file contents.
- A standalone user message `full` is the only upgrade command. Run `state full` for the active run, then resume from its checkpoint. Never upgrade automatically and never downgrade a full run.
- If fast cannot safely settle acceptance criteria because of material ambiguity, irreversible design, security, permissions, or migration rules, run `state block <step> --code=FULL_REQUIRED --message="输入 full 继续"` and stop. Do not continue or silently switch profiles.
- Both profiles retain real tests, Codex native review, OCR rule review, recovery, permissions, and OpenSpec archive gates.

## Phases

Execute `CLARIFY → PROPOSE → PLAN_REVIEW → APPLY → CODE_REVIEW → FINISH → ARCHIVE`. A failed gate may return to an earlier phase.

- **CLARIFY:** Read [references/clarify.md](references/clarify.md). Fast performs only light clarification and blocks with `FULL_REQUIRED` when deeper work is necessary. Full requires the installed `grill-with-docs` composition Skill, then invokes the host-visible `grilling` and `domain-modeling` skills directly. Decide `scenario`, `execution_mode`, acceptance criteria, and `ui_mode`.
- **PROPOSE:** Read [references/propose.md](references/propose.md). OpenSpec is the requirement source of truth; do not emulate it when its CLI is missing.
- **PLAN_REVIEW:** Read [references/plan-review.md](references/plan-review.md). In `review` mode, the user's explicit approval must match the current `plan_hash`.
- **APPLY:** Read [references/apply.md](references/apply.md). Execute tracked tasks with the smallest complete change and real tests. Load `$ui-parser` only when the UI mode requires Figma.
- **CODE_REVIEW:** Read [references/code-review.md](references/code-review.md). Use OCR preview to fix the scope, run Codex native review, then load `$open-code-review-delegate` for the OCR-guided second review. Return to the earliest phase that owns a defect.
- **FINISH / ARCHIVE:** Read [references/finish.md](references/finish.md). Run the finish gate, directly archive the completed OpenSpec Change, verify the external result, then write completion status.

## UI routing

- `none`: no UI artifacts or Figma checks.
- `existing`: reuse and verify the project's existing UI system; no Figma required.
- `figma_preferred`: use `$ui-parser`; an unavailable design may continue only with a recorded fallback reason.
- `figma_required`: use `$ui-parser`; missing or invalid design evidence blocks the UI task.

If implementation unexpectedly requires UI work, stop APPLY, update the plan and UI mode, rerun plan review, then run UI Preflight.

## Invariants

- OpenSpec holds requirements; Figma holds design facts; state stores only control data and fingerprints.
- Do not overwrite user changes, weaken tests, invent tool responses, or claim unexecuted checks passed.
- `auto` bypasses routine plan approval only. Sandbox approvals, destructive actions, production deployment, secrets, and other high-impact actions retain their own authorization boundary.
- After three consecutive automated repair attempts, preserve evidence and mark the step `blocked`.
