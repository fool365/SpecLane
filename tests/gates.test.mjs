import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  atomicWriteJson,
  checkArchive,
  checkCompletion,
  checkFinish,
  checkPlan,
  checkUi,
  planHash,
  preflight,
} from '../skills/speclane/scripts/speclane.mjs';
import { validateUiContext } from '../skills/ui-parser/scripts/validate-ui-context.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function fixture(name) {
  const base = join(repository, '.test-tmp');
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, 'gate-'));
  await cp(join(repository, 'examples', name), root, { recursive: true });
  return root;
}

async function readyState(root) {
  const state = JSON.parse(await readFile(join(root, 'state.template.json'), 'utf8'));
  state.plan_hash = (await planHash(join(root, 'change'))).hash;
  return state;
}

test('非UI模式不要求Figma上下文', async () => {
  const root = await fixture('backend-change');
  const state = await readyState(root);
  assert.deepEqual(await checkUi(join(root, 'change'), state), { ok: true, issues: [], warnings: [] });
});

test('环境检查不会跳过固定外部Skill', () => {
  assert.ok(preflight().issues.includes('EXTERNAL_SKILLS_NOT_CHECKED'));
  assert.ok(preflight({ availableSkills: ['grill-with-docs'] }).issues.includes('REQUIRED_SKILL_NOT_FOUND:grilling'));
  assert.ok(preflight({
    availableSkills: ['grill-with-docs', 'grilling', 'domain-modeling'],
  }).issues.includes('REQUIRED_SKILL_NOT_FOUND:open-code-review-delegate'));
  const complete = preflight({
    availableSkills: ['grill-with-docs', 'grilling', 'domain-modeling', 'open-code-review-delegate'],
  });
  assert.equal(complete.issues.some((item) => item.startsWith('REQUIRED_SKILL_NOT_FOUND')), false);
});

test('环境检查接受已安装但禁止模型调用的组合Skill', () => {
  const result = preflight({
    availableSkills: ['grilling', 'domain-modeling', 'open-code-review-delegate'],
    env: { CODEX_HOME: '/codex' },
    home: '/home/user',
    fileExists: (path) => path === join('/codex', 'skills', 'grill-with-docs', 'SKILL.md'),
  });
  assert.equal(result.issues.some((item) => item.startsWith('REQUIRED_SKILL_NOT_FOUND')), false);
});

test('环境检查仍阻止未安装的组合Skill', () => {
  const result = preflight({
    availableSkills: ['grilling', 'domain-modeling', 'open-code-review-delegate'],
    fileExists: () => false,
  });
  assert.ok(result.issues.includes('REQUIRED_SKILL_NOT_FOUND:grill-with-docs'));
});

test('环境检查在OCR缺失时阻塞', () => {
  const run = (command) => command.startsWith('ocr')
    ? { status: 1, stdout: '', stderr: 'missing' }
    : { status: 0, stdout: '1.0.0', stderr: '' };
  const result = preflight({
    availableSkills: ['grill-with-docs', 'grilling', 'domain-modeling', 'open-code-review-delegate'],
    run,
  });
  assert.ok(result.issues.includes('OCR_NOT_FOUND'));
});

test('figma_required有效示例通过UI和完成门禁', async () => {
  const root = await fixture('figma-ui-change');
  const state = await readyState(root);
  assert.equal((await checkUi(join(root, 'change'), state)).ok, true);
  assert.equal((await checkFinish(join(root, 'change'), state)).ok, true);
});

test('figma_required缺少证据时失败', () => {
  const result = validateUiContext({
    schema_version: 1,
    change_id: 'x',
    ui_mode: 'figma_required',
    references: [],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('FIGMA_REFERENCE_REQUIRED'));
});

test('figma_preferred只有记录原因后才能降级', () => {
  const invalid = validateUiContext({ schema_version: 1, change_id: 'x', ui_mode: 'figma_preferred', references: [] });
  const valid = validateUiContext({
    schema_version: 1,
    change_id: 'x',
    ui_mode: 'figma_preferred',
    references: [],
    fallback: { reason: 'Figma unavailable' },
  });
  assert.equal(invalid.valid, false);
  assert.equal(valid.valid, true);
  assert.equal(valid.degraded, true);
});

test('未解决P1冲突阻止UI门禁', async () => {
  const root = await fixture('figma-ui-change');
  const conflicts = join(root, 'change', 'ui', 'conflicts.json');
  const value = JSON.parse(await readFile(conflicts, 'utf8'));
  value.conflicts[0] = { ...value.conflicts[0], id: 'P1-1', severity: 'P1', status: 'open' };
  await writeFile(conflicts, JSON.stringify(value));
  const state = await readyState(root);
  const result = await checkUi(join(root, 'change'), state);
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('UNRESOLVED_P1:P1-1'));
});

test('review模式要求当前方案的明确批准', async () => {
  const root = await fixture('backend-change');
  const state = await readyState(root);
  state.execution_mode = 'review';
  let result = await checkPlan(join(root, 'change'), state);
  assert.ok(result.issues.includes('PLAN_APPROVAL_REQUIRED'));
  state.approval = { approved: true, approved_plan_hash: state.plan_hash, evidence: '用户批准' };
  result = await checkPlan(join(root, 'change'), state);
  assert.equal(result.ok, true);
});

test('未完成任务阻止完成门禁', async () => {
  const root = await fixture('backend-change');
  const tasks = join(root, 'change', 'tasks.md');
  await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('[x]', '[ ]'));
  const state = await readyState(root);
  const result = await checkFinish(join(root, 'change'), state);
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('TASK_NOT_DONE:1.1'));
});

test('缺少OCR审查证据阻止完成门禁', async () => {
  const root = await fixture('backend-change');
  await rm(join(root, 'change', 'reviews', 'code-review-ocr.md'));
  const state = await readyState(root);
  const result = await checkFinish(join(root, 'change'), state);
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('OCR_CODE_REVIEW_EVIDENCE_REQUIRED'));
});

test('只有带证据的OpenSpec归档通过后才能完成运行', async () => {
  const root = await fixture('backend-change');
  const state = await readyState(root);
  delete state.steps.archive;
  assert.ok(checkArchive(state).issues.includes('OPENSPEC_ARCHIVE_NOT_PASSED'));
  assert.equal((await checkCompletion(join(root, 'change'), state)).ok, false);

  state.steps.archive = { status: 'passed', attempts: 1 };
  assert.ok(checkArchive(state).issues.includes('OPENSPEC_ARCHIVE_EVIDENCE_REQUIRED'));

  state.steps.archive.evidence = ['openspec/changes/archive/2026-10-26-change'];
  assert.equal(checkArchive(state).ok, true);
  assert.equal((await checkCompletion(join(root, 'change'), state)).ok, true);
});

test('UI契约CLI使用的JSON可以被独立保存和验证', async () => {
  const root = await fixture('figma-ui-change');
  const value = JSON.parse(await readFile(join(root, 'change', 'ui', 'ui-context.json'), 'utf8'));
  const target = join(root, 'copy.json');
  await atomicWriteJson(target, value);
  assert.equal(validateUiContext(JSON.parse(await readFile(target, 'utf8'))).valid, true);
});
