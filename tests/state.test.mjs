import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  approvePlan,
  beginStep,
  failStep,
  initState,
  passStep,
  planHash,
  readJson,
  recordReviewRepair,
  resumeState,
  stateSummary,
  syncPlan,
  upgradeToFull,
} from '../skills/speclane/scripts/speclane.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stateCli = join(repository, 'skills', 'speclane', 'scripts', 'speclane.mjs');

async function temp() {
  const base = join(repository, '.test-tmp');
  await mkdir(base, { recursive: true });
  return mkdtemp(join(base, 'state-'));
}

async function createPlan(root, suffix = '') {
  const change = join(root, 'change');
  await mkdir(join(change, 'specs', 'core'), { recursive: true });
  await Promise.all([
    writeFile(join(change, 'proposal.md'), `proposal${suffix}`),
    writeFile(join(change, 'design.md'), 'design'),
    writeFile(join(change, 'tasks.md'), '- [ ] 1.1 task'),
    writeFile(join(change, 'specs', 'core', 'spec.md'), 'spec'),
  ]);
  return change;
}

test('状态初始化拒绝覆盖，并在更新前保留备份', async () => {
  const root = await temp();
  const statePath = join(root, 'state.json');
  await initState(statePath, {
    runId: 'run-1',
    changeId: 'change-1',
    scenario: 'iteration',
    executionMode: 'auto',
    uiMode: 'none',
  });
  await assert.rejects(() => initState(statePath, {
    runId: 'run-1', changeId: 'change-1', scenario: 'iteration', executionMode: 'auto', uiMode: 'none',
  }), /already exists/);

  await beginStep(statePath, 'propose');
  const state = await readJson(statePath);
  assert.equal(state.workflow_profile, 'fast');
  assert.equal(state.steps.propose.status, 'running');
  assert.equal((await readJson(`${statePath}.bak`)).current_step, 'clarify');
});

test('full 显式升级并解除 FULL_REQUIRED 阻塞', async () => {
  const root = await temp();
  const statePath = join(root, 'state.json');
  await initState(statePath, {
    runId: 'run-full', changeId: 'change-full', scenario: 'iteration', executionMode: 'auto', uiMode: 'none',
  });
  await failStep(statePath, 'clarify', {
    code: 'FULL_REQUIRED', message: '输入 full 继续', blocked: true,
  });
  const upgraded = await upgradeToFull(statePath);
  assert.equal(upgraded.workflow_profile, 'full');
  assert.equal(upgraded.status, 'running');
  assert.equal(upgraded.steps.clarify.status, 'interrupted');
  assert.equal(upgraded.last_error, null);
  assert.equal((await upgradeToFull(statePath)).workflow_profile, 'full');
});

test('恢复没有档次字段的旧状态时迁移为 full', async () => {
  const root = await temp();
  const statePath = join(root, 'state.json');
  const legacy = await initState(statePath, {
    runId: 'run-legacy', changeId: 'change-legacy', scenario: 'iteration', executionMode: 'auto', uiMode: 'none',
  });
  delete legacy.workflow_profile;
  await writeFile(statePath, `${JSON.stringify(legacy, null, 2)}\n`);
  assert.equal((await resumeState(statePath)).workflow_profile, 'full');
});

test('状态命令默认输出摘要并用 --json 输出完整状态', async () => {
  const root = await temp();
  const statePath = join(root, 'state.json');
  await initState(statePath, {
    runId: 'run-output', changeId: 'change-output', scenario: 'iteration', executionMode: 'auto', uiMode: 'none',
  });
  const compact = spawnSync(process.execPath, [stateCli, 'state', 'begin', 'propose', '--state', statePath], { encoding: 'utf8' });
  assert.equal(compact.status, 0, compact.stderr);
  const summary = JSON.parse(compact.stdout);
  assert.equal(summary.workflow_profile, 'fast');
  assert.equal(summary.current_step, 'propose');
  assert.equal('steps' in summary, false);
  assert.deepEqual(summary, stateSummary(await readJson(statePath)));

  const full = spawnSync(process.execPath, [stateCli, 'state', 'pass', 'propose', '--state', statePath, '--json'], { encoding: 'utf8' });
  assert.equal(full.status, 0, full.stderr);
  assert.equal(JSON.parse(full.stdout).steps.propose.status, 'passed');
});

test('恢复把运行中的步骤标记为 interrupted', async () => {
  const root = await temp();
  const statePath = join(root, 'state.json');
  await initState(statePath, {
    runId: 'run-2', changeId: 'change-2', scenario: 'bootstrap', executionMode: 'review', uiMode: 'existing',
  });
  await beginStep(statePath, 'apply:T001');
  const state = await resumeState(statePath);
  assert.equal(state.steps['apply:T001'].status, 'interrupted');
  assert.equal(state.status, 'running');
});

test('恢复时把运行中的归档标记为 interrupted，等待核对外部结果', async () => {
  const root = await temp();
  const statePath = join(root, 'state.json');
  await initState(statePath, {
    runId: 'run-archive', changeId: 'change-archive', scenario: 'iteration', executionMode: 'auto', uiMode: 'none',
  });
  await beginStep(statePath, 'archive');
  const state = await resumeState(statePath);
  assert.equal(state.steps.archive.status, 'interrupted');
  assert.equal(state.current_step, 'archive');
});

test('恢复保留已通过原生审查并中断运行中的OCR复审', async () => {
  const root = await temp();
  const statePath = join(root, 'state.json');
  const changePath = join(root, 'change');
  await mkdir(join(changePath, 'reviews'), { recursive: true });
  await writeFile(join(changePath, 'reviews', 'code-review-native.md'), 'PASS');
  await initState(statePath, {
    runId: 'run-review', changeId: 'change-review', scenario: 'iteration', executionMode: 'auto', uiMode: 'none',
  });
  await passStep(statePath, 'code_review:native', ['native.md']);
  await beginStep(statePath, 'code_review:ocr');
  const state = await resumeState(statePath, changePath);
  assert.equal(state.steps['code_review:native'].status, 'passed');
  assert.equal(state.steps['code_review:ocr'].status, 'interrupted');
});

test('恢复时缺少原生审查证据会重置后续审查步骤', async () => {
  const root = await temp();
  const statePath = join(root, 'state.json');
  const changePath = join(root, 'change');
  await mkdir(join(changePath, 'reviews'), { recursive: true });
  await initState(statePath, {
    runId: 'run-missing-review', changeId: 'change-missing-review', scenario: 'iteration', executionMode: 'auto', uiMode: 'none',
  });
  await passStep(statePath, 'code_review:native');
  await passStep(statePath, 'code_review:ocr');
  await passStep(statePath, 'code_review');
  const state = await resumeState(statePath, changePath);
  assert.equal(state.steps['code_review:native'].status, 'pending');
  assert.equal(state.steps['code_review:ocr'].status, 'pending');
  assert.equal(state.steps.code_review.status, 'pending');
  assert.equal(state.current_step, 'code_review:native');
  assert.equal(state.status, 'running');
});

test('三次审查修复后再次发现问题会阻塞', async () => {
  const root = await temp();
  const statePath = join(root, 'state.json');
  await initState(statePath, {
    runId: 'run-repair', changeId: 'change-repair', scenario: 'iteration', executionMode: 'auto', uiMode: 'none',
  });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await passStep(statePath, 'code_review:native');
    await passStep(statePath, 'code_review:ocr');
    const state = await recordReviewRepair(statePath);
    assert.equal(state.repair_attempts, attempt);
    assert.equal(state.steps['code_review:native'].status, 'pending');
  }
  const blocked = await recordReviewRepair(statePath);
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.last_error.code, 'REVIEW_REPAIR_LIMIT');
});

test('方案哈希稳定，并在内容变化时改变', async () => {
  const root = await temp();
  const change = await createPlan(root);
  const first = await planHash(change);
  const second = await planHash(change);
  assert.equal(first.hash, second.hash);
  await writeFile(join(change, 'proposal.md'), 'changed proposal');
  assert.notEqual((await planHash(change)).hash, first.hash);
});

test('勾选任务进度不会改变已批准方案哈希', async () => {
  const root = await temp();
  const change = await createPlan(root);
  const first = await planHash(change);
  await writeFile(join(change, 'tasks.md'), '- [x] 1.1 task');
  assert.equal((await planHash(change)).hash, first.hash);
});

test('方案变化使批准和后续步骤失效', async () => {
  const root = await temp();
  const change = await createPlan(root);
  const statePath = join(root, 'state.json');
  await initState(statePath, {
    runId: 'run-3', changeId: 'change-3', scenario: 'iteration', executionMode: 'review', uiMode: 'none',
  });
  await syncPlan(statePath, change);
  await approvePlan(statePath, '用户批准');
  await passStep(statePath, 'plan_review');
  await passStep(statePath, 'apply:T001');
  await passStep(statePath, 'code_review:native');
  await passStep(statePath, 'code_review:ocr');
  await passStep(statePath, 'code_review');
  await passStep(statePath, 'archive', ['archive/path']);
  await writeFile(join(change, 'proposal.md'), 'new proposal');
  const updated = await syncPlan(statePath, change);
  assert.equal(updated.approval.approved, false);
  assert.equal(updated.steps.plan_review.status, 'pending');
  assert.equal(updated.steps['apply:T001'].status, 'pending');
  assert.equal(updated.steps['code_review:native'].status, 'pending');
  assert.equal(updated.steps['code_review:ocr'].status, 'pending');
  assert.equal(updated.steps.code_review.status, 'pending');
  assert.equal(updated.steps.archive.status, 'pending');
  assert.match(await readFile(statePath, 'utf8'), /"plan_hash"/);
});
