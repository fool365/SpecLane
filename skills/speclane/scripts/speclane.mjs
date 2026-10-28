#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  access,
  copyFile,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateUiContext } from '../../ui-parser/scripts/validate-ui-context.mjs';

const UI_MODES = new Set(['none', 'existing', 'figma_preferred', 'figma_required']);
const SCENARIOS = new Set(['bootstrap', 'iteration', 'extension']);
const MODES = new Set(['auto', 'review']);
const WORKFLOW_PROFILES = new Set(['fast', 'full']);
const NODE_MIN = [20, 19, 0];
const REVIEW_STEPS = ['code_review:native', 'code_review:ocr', 'code_review'];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function now() {
  return new Date().toISOString();
}

function requireChoice(name, value, allowed) {
  if (!allowed.has(value)) throw new Error(`${name} must be one of: ${[...allowed].join(', ')}`);
  return value;
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.${Date.now()}.tmp`;
  const backup = `${path}.bak`;
  const handle = await open(temp, 'wx');
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    if (await exists(path)) await copyFile(path, backup);
    await rename(temp, path);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

export function createInitialState({ runId, changeId, scenario, executionMode, uiMode }) {
  requireChoice('scenario', scenario, SCENARIOS);
  requireChoice('executionMode', executionMode, MODES);
  requireChoice('uiMode', uiMode, UI_MODES);
  if (!runId || !changeId) throw new Error('runId and changeId are required');
  const timestamp = now();
  return {
    schema_version: 1,
    run_id: runId,
    change_id: changeId,
    workflow_profile: 'fast',
    scenario,
    execution_mode: executionMode,
    ui_mode: uiMode,
    status: 'running',
    current_step: 'clarify',
    plan_hash: null,
    approval: {
      approved: false,
      approved_plan_hash: null,
      evidence: null,
    },
    repair_attempts: 0,
    steps: {
      clarify: { status: 'running', attempts: 1, started_at: timestamp },
    },
    last_error: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function workflowProfile(state) {
  return requireChoice('workflowProfile', state.workflow_profile ?? 'full', WORKFLOW_PROFILES);
}

export function stateSummary(state) {
  const currentStep = state.current_step;
  return {
    ok: true,
    run_id: state.run_id,
    workflow_profile: workflowProfile(state),
    status: state.status,
    current_step: currentStep,
    step_status: currentStep ? state.steps?.[currentStep]?.status ?? null : null,
    error: state.last_error ? {
      code: state.last_error.code,
      message: state.last_error.message,
    } : null,
  };
}

export async function initState(path, options) {
  if (await exists(path)) throw new Error(`State already exists: ${path}`);
  const state = createInitialState(options);
  await atomicWriteJson(path, state);
  return state;
}

export async function updateState(path, mutate) {
  const state = await readJson(path);
  const result = await mutate(state) ?? state;
  result.updated_at = now();
  await atomicWriteJson(path, result);
  return result;
}

export async function beginStep(path, step) {
  if (!step) throw new Error('step is required');
  return updateState(path, (state) => {
    const previous = state.steps[step] ?? { attempts: 0 };
    state.steps[step] = {
      ...previous,
      status: 'running',
      attempts: (previous.attempts ?? 0) + 1,
      started_at: now(),
    };
    state.current_step = step;
    state.status = 'running';
    state.last_error = null;
  });
}

export async function passStep(path, step, evidence = []) {
  return updateState(path, (state) => {
    const previous = state.steps[step] ?? { attempts: 0 };
    state.steps[step] = {
      ...previous,
      status: 'passed',
      completed_at: now(),
      ...(evidence.length ? { evidence } : {}),
    };
    state.current_step = step;
    state.status = 'running';
    state.last_error = null;
  });
}

export async function failStep(path, step, { code = 'STEP_FAILED', message = 'Step failed', blocked = false } = {}) {
  return updateState(path, (state) => {
    const previous = state.steps[step] ?? { attempts: 0 };
    state.steps[step] = { ...previous, status: blocked ? 'blocked' : 'failed', failed_at: now() };
    state.current_step = step;
    state.status = blocked ? 'blocked' : 'partial';
    state.last_error = { step, code, message, occurred_at: now() };
  });
}

export async function awaitStep(path, step, kind) {
  if (!['approval', 'user'].includes(kind)) throw new Error('kind must be approval or user');
  const status = kind === 'approval' ? 'awaiting_approval' : 'awaiting_user_input';
  return updateState(path, (state) => {
    const previous = state.steps[step] ?? { attempts: 0 };
    state.steps[step] = { ...previous, status };
    state.current_step = step;
    state.status = status;
  });
}

export async function resumeState(path, changePath) {
  return updateState(path, async (state) => {
    state.workflow_profile ??= 'full';
    workflowProfile(state);
    for (const step of Object.values(state.steps)) {
      if (step.status === 'running') step.status = 'interrupted';
    }
    if (changePath) {
      let invalidate = false;
      let restartAt;
      for (const [step, file] of [
        ['code_review:native', 'code-review-native.md'],
        ['code_review:ocr', 'code-review-ocr.md'],
        ['code_review', 'code-review.md'],
      ]) {
        if (state.steps[step]?.status === 'passed' && !(await nonEmptyFile(join(changePath, 'reviews', file)))) {
          invalidate = true;
          restartAt ??= step;
        }
        if (invalidate && state.steps[step]) {
          state.steps[step] = { status: 'pending', attempts: state.steps[step].attempts ?? 0 };
        }
      }
      if (restartAt) {
        state.current_step = restartAt;
        state.status = 'running';
      }
    }
    if (state.status === 'running' || state.status === 'partial') state.status = 'running';
    state.resumed_at = now();
  });
}

export async function upgradeToFull(path) {
  return updateState(path, (state) => {
    workflowProfile(state);
    state.workflow_profile = 'full';
    if (state.last_error?.code === 'FULL_REQUIRED') {
      const step = state.current_step;
      const previous = state.steps[step] ?? { attempts: 0 };
      const { failed_at: _failedAt, ...rest } = previous;
      state.steps[step] = { ...rest, status: 'interrupted' };
      state.status = 'running';
      state.last_error = null;
    }
  });
}

export async function recordReviewRepair(path) {
  return updateState(path, (state) => {
    const attempts = state.repair_attempts ?? 0;
    if (attempts >= 3) {
      const previous = state.steps.code_review ?? { attempts: 0 };
      state.steps.code_review = { ...previous, status: 'blocked', failed_at: now() };
      state.current_step = 'code_review';
      state.status = 'blocked';
      state.last_error = {
        step: 'code_review',
        code: 'REVIEW_REPAIR_LIMIT',
        message: 'Three automated review repairs did not clear blocking findings',
        occurred_at: now(),
      };
      return;
    }
    state.repair_attempts = attempts + 1;
    for (const step of REVIEW_STEPS) {
      state.steps[step] = { status: 'pending', attempts: state.steps[step]?.attempts ?? 0 };
    }
    state.current_step = 'apply';
    state.status = 'running';
    state.last_error = {
      step: 'code_review',
      code: 'REVIEW_FINDINGS',
      message: `Blocking review findings require repair ${state.repair_attempts}/3`,
      occurred_at: now(),
    };
  });
}

async function listFiles(root) {
  const output = [];
  if (!(await exists(root))) return output;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...await listFiles(path));
    else if (entry.isFile()) output.push(path);
  }
  return output;
}

function portablePath(path) {
  return path.split(sep).join('/');
}

export async function planHash(changePath) {
  const required = ['proposal.md', 'design.md', 'tasks.md'];
  const files = [];
  for (const name of required) {
    const path = join(changePath, name);
    if (!(await exists(path))) throw new Error(`Missing plan file: ${name}`);
    files.push(path);
  }
  const specs = (await listFiles(join(changePath, 'specs'))).filter((path) => path.endsWith('.md'));
  if (specs.length === 0) throw new Error('Missing plan specs');
  files.push(...specs);
  const uiContext = join(changePath, 'ui', 'ui-context.json');
  if (await exists(uiContext)) files.push(uiContext);

  const sorted = files.sort((a, b) => portablePath(relative(changePath, a)).localeCompare(portablePath(relative(changePath, b))));
  const hash = createHash('sha256');
  for (const path of sorted) {
    const rel = portablePath(relative(changePath, path));
    let content = await readFile(path);
    if (rel === 'tasks.md') {
      content = Buffer.from(content.toString('utf8').replace(/^(\s*-\s+\[)[ xX](\])/gm, '$1 $2'));
    }
    hash.update(rel);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }
  return {
    hash: `sha256:${hash.digest('hex')}`,
    files: sorted.map((path) => portablePath(relative(changePath, path))),
  };
}

export async function syncPlan(path, changePath) {
  const current = await planHash(changePath);
  return updateState(path, (state) => {
    if (state.plan_hash && state.plan_hash !== current.hash) {
      state.approval = { approved: false, approved_plan_hash: null, evidence: null };
      for (const [name, step] of Object.entries(state.steps)) {
        if (name === 'plan_review' || name.startsWith('apply:') || name.startsWith('code_review') || name === 'finish' || name === 'archive') {
          step.status = 'pending';
        }
      }
    }
    state.plan_hash = current.hash;
    state.plan_files = current.files;
  });
}

export async function approvePlan(path, evidence) {
  return updateState(path, (state) => {
    if (!state.plan_hash) throw new Error('Plan hash is not set');
    state.approval = {
      approved: true,
      approved_plan_hash: state.plan_hash,
      evidence: evidence || 'User explicitly approved the current plan',
      approved_at: now(),
    };
  });
}

async function nonEmptyFile(path) {
  if (!(await exists(path))) return false;
  return (await stat(path)).size > 0;
}

export async function checkPlan(changePath, state) {
  const issues = [];
  let current;
  try {
    current = await planHash(changePath);
  } catch (error) {
    issues.push(error.message);
    return { ok: false, issues };
  }
  if (!(await nonEmptyFile(join(changePath, 'reviews', 'plan-review.md')))) issues.push('PLAN_REVIEW_EVIDENCE_REQUIRED');
  if (state.plan_hash !== current.hash) issues.push('PLAN_HASH_MISMATCH');
  if (state.steps?.plan_review?.status !== 'passed') issues.push('PLAN_REVIEW_NOT_PASSED');
  if (state.execution_mode === 'review') {
    if (!state.approval?.approved) issues.push('PLAN_APPROVAL_REQUIRED');
    if (state.approval?.approved_plan_hash !== current.hash) issues.push('APPROVED_PLAN_HASH_MISMATCH');
  }
  return { ok: issues.length === 0, issues, plan_hash: current.hash };
}

export async function checkUi(changePath, state) {
  const issues = [];
  const warnings = [];
  if (state.ui_mode === 'none' || state.ui_mode === 'existing') return { ok: true, issues, warnings };

  const contextPath = join(changePath, 'ui', 'ui-context.json');
  if (!(await exists(contextPath))) return { ok: false, issues: ['UI_CONTEXT_REQUIRED'], warnings };
  const validation = validateUiContext(await readJson(contextPath), { expectedChangeId: state.change_id });
  issues.push(...validation.errors);
  warnings.push(...validation.warnings);

  const conflictsPath = join(changePath, 'ui', 'conflicts.json');
  if (await exists(conflictsPath)) {
    const conflicts = await readJson(conflictsPath);
    if (!Array.isArray(conflicts.conflicts)) issues.push('CONFLICTS_MUST_BE_ARRAY');
    else {
      for (const conflict of conflicts.conflicts) {
        if (['P0', 'P1'].includes(conflict.severity) && !['resolved', 'approved'].includes(conflict.status)) {
          issues.push(`UNRESOLVED_${conflict.severity}:${conflict.id ?? 'unknown'}`);
        }
      }
    }
  }
  return { ok: issues.length === 0, issues, warnings, degraded: validation.degraded };
}

function trackedTasks(markdown) {
  return markdown.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*- \[([^\]]*)\]\s+(\d+(?:\.\d+)*)\s+(.+)$/);
    return match ? [{ id: match[2], done: match[1].trim().toLowerCase() === 'x', text: match[3] }] : [];
  });
}

export async function checkFinish(changePath, state) {
  const issues = [];
  const plan = await checkPlan(changePath, state);
  issues.push(...plan.issues);

  const tasksPath = join(changePath, 'tasks.md');
  if (!(await exists(tasksPath))) issues.push('TASKS_REQUIRED');
  else {
    const tasks = trackedTasks(await readFile(tasksPath, 'utf8'));
    if (tasks.length === 0) issues.push('TRACKED_TASKS_REQUIRED');
    for (const task of tasks.filter((item) => !item.done)) issues.push(`TASK_NOT_DONE:${task.id}`);
  }

  for (const [step, file, issue] of [
    ['code_review:native', 'code-review-native.md', 'NATIVE_CODE_REVIEW'],
    ['code_review:ocr', 'code-review-ocr.md', 'OCR_CODE_REVIEW'],
    ['code_review', 'code-review.md', 'CODE_REVIEW'],
  ]) {
    if (state.steps?.[step]?.status !== 'passed') issues.push(`${issue}_NOT_PASSED`);
    if (!(await nonEmptyFile(join(changePath, 'reviews', file)))) issues.push(`${issue}_EVIDENCE_REQUIRED`);
  }
  if (!(await nonEmptyFile(join(changePath, 'verification.md')))) issues.push('VERIFICATION_EVIDENCE_REQUIRED');

  const ui = await checkUi(changePath, state);
  issues.push(...ui.issues);
  return { ok: issues.length === 0, issues, warnings: ui.warnings ?? [] };
}

export function checkArchive(state) {
  const archive = state.steps?.archive;
  const issues = [];
  if (archive?.status !== 'passed') issues.push('OPENSPEC_ARCHIVE_NOT_PASSED');
  if (!Array.isArray(archive?.evidence) || archive.evidence.length === 0) {
    issues.push('OPENSPEC_ARCHIVE_EVIDENCE_REQUIRED');
  }
  return { ok: issues.length === 0, issues };
}

export async function checkCompletion(changePath, state) {
  const finish = await checkFinish(changePath, state);
  const archive = checkArchive(state);
  const issues = [...finish.issues, ...archive.issues];
  return { ok: issues.length === 0, issues, warnings: finish.warnings };
}

function versionAtLeast(actual, expected) {
  for (let index = 0; index < expected.length; index += 1) {
    const value = actual[index] ?? 0;
    if (value > expected[index]) return true;
    if (value < expected[index]) return false;
  }
  return true;
}

function installedSkill(name, env, home, fileExists) {
  const codexHome = env.CODEX_HOME || join(home, '.codex');
  return [
    join(codexHome, 'skills', name, 'SKILL.md'),
    join(home, '.agents', 'skills', name, 'SKILL.md'),
  ].some(fileExists);
}

export function preflight({
  availableSkills,
  run = spawnSync,
  env = process.env,
  home = homedir(),
  fileExists = existsSync,
} = {}) {
  const issues = [];
  const warnings = [];
  const nodeVersion = process.versions.node;
  const parsedNode = nodeVersion.split('.').map(Number);
  if (!versionAtLeast(parsedNode, NODE_MIN)) issues.push('NODE_VERSION_UNSUPPORTED');

  const openspec = run('openspec --version', { encoding: 'utf8', shell: true });
  if (openspec.error || openspec.status !== 0) issues.push('OPENSPEC_NOT_FOUND');

  const ocr = run('ocr --version', { encoding: 'utf8', shell: true });
  if (ocr.error || ocr.status !== 0) issues.push('OCR_NOT_FOUND');
  else {
    const delegate = run('ocr delegate preview --help', { encoding: 'utf8', shell: true });
    if (delegate.error || delegate.status !== 0) issues.push('OCR_DELEGATION_NOT_AVAILABLE');
  }

  const requiredSkills = ['grill-with-docs', 'grilling', 'domain-modeling', 'open-code-review-delegate'];
  if (availableSkills) {
    const available = new Set(availableSkills);
    for (const skill of requiredSkills) {
      const hiddenButInstalled = skill === 'grill-with-docs' && installedSkill(skill, env, home, fileExists);
      if (!available.has(skill) && !hiddenButInstalled) issues.push(`REQUIRED_SKILL_NOT_FOUND:${skill}`);
    }
  } else {
    issues.push('EXTERNAL_SKILLS_NOT_CHECKED');
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    node: nodeVersion,
    openspec: openspec.status === 0 ? openspec.stdout.trim() : null,
    ocr: ocr.status === 0 ? ocr.stdout.trim() : null,
    required_skills: requiredSkills,
  };
}

export async function detectProject(root) {
  const ignored = new Set(['.git', '.auto-dev', 'node_modules']);
  const entries = (await readdir(root, { withFileTypes: true })).filter((entry) => !ignored.has(entry.name));
  return {
    root,
    has_git: await exists(join(root, '.git')),
    has_package_json: await exists(join(root, 'package.json')),
    has_openspec: await exists(join(root, 'openspec')),
    content_entries: entries.map((entry) => entry.name).sort(),
    appears_empty: entries.length === 0,
    note: 'Scenario must combine these facts with explicit user intent.',
  };
}

function parseOptions(args) {
  const options = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      options._.push(arg);
      continue;
    }
    const equal = arg.indexOf('=');
    if (equal > 0) {
      options[arg.slice(2, equal)] = arg.slice(equal + 1);
    } else if (args[index + 1] && !args[index + 1].startsWith('--')) {
      options[arg.slice(2)] = args[index + 1];
      index += 1;
    } else {
      options[arg.slice(2)] = true;
    }
  }
  return options;
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printState(value, full) {
  process.stdout.write(`${JSON.stringify(full ? value : stateSummary(value), null, full ? 2 : 0)}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const subcommand = command === 'state' ? args[1] : undefined;
  const rest = command === 'state' ? args.slice(2) : args.slice(1);
  const options = parseOptions(rest);
  const root = resolve(options.root || process.cwd());

  if (command === 'preflight') {
    const skills = options['available-skills'] ? String(options['available-skills']).split(',').map((item) => item.trim()).filter(Boolean) : undefined;
    const result = preflight({ availableSkills: skills });
    print(result);
    if (!result.ok) process.exitCode = 1;
    return;
  }
  if (command === 'detect') {
    print(await detectProject(root));
    return;
  }

  const statePath = resolve(options.state || (options['run-id'] ? join(root, '.auto-dev', 'runs', options['run-id'], 'state.json') : ''));
  if (command === 'state') {
    if (!subcommand) throw new Error('state subcommand is required');
    if (subcommand === 'init') {
      printState(await initState(statePath, {
        runId: options['run-id'],
        changeId: options['change-id'],
        scenario: options.scenario,
        executionMode: options.mode,
        uiMode: options['ui-mode'],
      }), options.json);
    } else if (subcommand === 'begin') {
      printState(await beginStep(statePath, options._[0]), options.json);
    } else if (subcommand === 'pass') {
      const evidence = options.evidence ? String(options.evidence).split(',').map((item) => item.trim()).filter(Boolean) : [];
      printState(await passStep(statePath, options._[0], evidence), options.json);
    } else if (subcommand === 'fail' || subcommand === 'block') {
      printState(await failStep(statePath, options._[0], {
        code: options.code,
        message: options.message,
        blocked: subcommand === 'block',
      }), options.json);
    } else if (subcommand === 'await') {
      printState(await awaitStep(statePath, options._[0], options.kind), options.json);
    } else if (subcommand === 'resume') {
      printState(await resumeState(statePath, options.change ? resolve(options.change) : undefined), options.json);
    } else if (subcommand === 'full') {
      printState(await upgradeToFull(statePath), options.json);
    } else if (subcommand === 'repair-review') {
      printState(await recordReviewRepair(statePath), options.json);
    } else if (subcommand === 'sync-plan') {
      printState(await syncPlan(statePath, resolve(options.change)), options.json);
    } else if (subcommand === 'approve-plan') {
      printState(await approvePlan(statePath, options.evidence), options.json);
    } else if (subcommand === 'complete') {
      const state = await readJson(statePath);
      const gate = await checkCompletion(resolve(options.change), state);
      if (!gate.ok) {
        print(gate);
        process.exitCode = 1;
      } else {
        printState(await updateState(statePath, (value) => {
          value.status = 'completed';
          value.current_step = 'archive';
          value.steps.finish = { ...(value.steps.finish ?? {}), status: 'passed', completed_at: now() };
        }), options.json);
      }
    } else {
      throw new Error(`Unknown state subcommand: ${subcommand}`);
    }
    return;
  }

  if (command === 'plan-hash') {
    print(await planHash(resolve(options.change)));
    return;
  }
  if (command === 'check-plan' || command === 'check-ui' || command === 'check-finish') {
    const state = await readJson(statePath);
    const change = resolve(options.change);
    const result = command === 'check-plan'
      ? await checkPlan(change, state)
      : command === 'check-ui'
        ? await checkUi(change, state)
        : await checkFinish(change, state);
    print(result);
    if (!result.ok) process.exitCode = 1;
    return;
  }

  throw new Error('Usage: speclane.mjs <preflight|detect|state|plan-hash|check-plan|check-ui|check-finish>');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
