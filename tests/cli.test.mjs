import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  CLARIFICATION_SKILLS,
  initialize,
  isMainModule,
  REVIEW_SKILL,
  resolveWindowsCommand,
} from '../bin/speclane.mjs';

function success(stdout = '') {
  return { status: 0, stdout, stderr: '' };
}

test('全局入口可跨目录联接识别主模块', () => {
  const realpath = () => 'E:\\npm\\speclane.mjs';
  assert.equal(isMainModule('C:\\npm\\speclane.mjs', 'E:\\npm\\speclane.mjs', realpath), true);
  assert.equal(isMainModule(undefined, 'E:\\npm\\speclane.mjs', realpath), false);
});

function createRuntime({ ready = false, codexAvailable = true, ocrInstallSucceeds = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'speclane-cli-'));
  const target = join(root, 'project');
  const state = {
    openspec: ready,
    skills: ready,
    ocr: ready,
    reviewSkill: ready,
    marketplace: ready,
    plugin: ready,
  };
  const calls = [];
  const exists = (path) => {
    if (path.endsWith(join('openspec', 'config.yaml'))) return ready;
    if (path.endsWith('SKILL.md')) return path.includes(REVIEW_SKILL) ? state.reviewSkill : state.skills;
    return false;
  };
  const run = (command, args) => {
    calls.push([command, ...args]);
    if (args[0] === '--version') {
      if (command === 'codex' && !codexAvailable) return { status: 1, stdout: '', stderr: 'missing' };
      if (command === 'openspec' && !state.openspec) return { status: 1, stdout: '', stderr: 'missing' };
      if (command === 'ocr' && !state.ocr) return { status: 1, stdout: '', stderr: 'missing' };
      return success('1.0.0');
    }
    if (command === 'npm' && args.includes('@fission-ai/openspec@latest')) state.openspec = true;
    if (command === 'npm' && args.includes('@alibaba-group/open-code-review@latest') && ocrInstallSucceeds) state.ocr = true;
    if (command === 'npx' && args.includes('mattpocock/skills')) state.skills = true;
    if (command === 'npx' && args.includes('alibaba/open-code-review')) state.reviewSkill = true;
    if (command === 'ocr' && args[0] === 'delegate') return state.ocr ? success() : { status: 1, stdout: '', stderr: 'missing' };
    if (command === 'codex' && args[0] === 'plugin' && args[1] === 'marketplace' && args[2] === 'list') {
      return success(JSON.stringify({ marketplaces: state.marketplace ? [{ name: 'speclane-marketplace' }] : [] }));
    }
    if (command === 'codex' && args[0] === 'plugin' && args[1] === 'marketplace' && args[2] === 'add') state.marketplace = true;
    if (command === 'codex' && args[0] === 'plugin' && args[1] === 'list') {
      return success(JSON.stringify({
        installed: state.plugin ? [{ pluginId: 'speclane@speclane-marketplace', enabled: true }] : [],
      }));
    }
    if (command === 'codex' && args[0] === 'plugin' && args[1] === 'add') state.plugin = true;
    return success();
  };
  return { root, target, state, calls, exists, run };
}

test('首次 init 安装缺失依赖并初始化目标项目', () => {
  const runtime = createRuntime();
  const result = initialize({
    target: runtime.target,
    cwd: runtime.root,
    home: runtime.root,
    platform: 'linux',
    exists: runtime.exists,
    run: runtime.run,
    log: () => {},
  });
  assert.equal(result.initialized, true);
  assert.equal(runtime.state.openspec, true);
  assert.equal(runtime.state.skills, true);
  assert.equal(runtime.state.ocr, true);
  assert.equal(runtime.state.reviewSkill, true);
  assert.equal(runtime.state.marketplace, true);
  assert.equal(runtime.state.plugin, true);
  assert.ok(runtime.calls.some((call) => call[0] === 'npm' && call.includes('@fission-ai/openspec@latest')));
  assert.ok(runtime.calls.some((call) => call[0] === 'npx' && CLARIFICATION_SKILLS.every((skill) => call.includes(skill))));
  assert.ok(runtime.calls.some((call) => call[0] === 'npm' && call.includes('@alibaba-group/open-code-review@latest')));
  assert.ok(runtime.calls.some((call) => call[0] === 'npx' && call.includes(REVIEW_SKILL)));
  assert.ok(runtime.calls.some((call) => call[0] === 'ocr' && call.includes('preview')));
  assert.ok(runtime.calls.some((call) => call[0] === 'openspec' && call[1] === 'init' && call.includes('--tools')));
});

test('重复 init 跳过安装且不覆盖已有 OpenSpec 配置', () => {
  const runtime = createRuntime({ ready: true });
  mkdirSync(join(runtime.target, 'openspec'), { recursive: true });
  writeFileSync(join(runtime.target, 'openspec', 'config.yaml'), 'schema: spec-driven');
  const result = initialize({
    target: runtime.target,
    cwd: runtime.root,
    home: runtime.root,
    platform: 'linux',
    exists: runtime.exists,
    run: runtime.run,
    log: () => {},
  });
  assert.equal(result.initialized, false);
  assert.equal(runtime.calls.some((call) => call[0] === 'npm' && call[1] === 'install'), false);
  assert.equal(runtime.calls.some((call) => call[0] === 'npx' && call.includes('mattpocock/skills')), false);
  assert.equal(runtime.calls.some((call) => call[0] === 'npm' && call.includes('@alibaba-group/open-code-review@latest')), false);
  assert.equal(runtime.calls.some((call) => call[0] === 'npx' && call.includes('alibaba/open-code-review')), false);
  assert.equal(runtime.calls.some((call) => call[0] === 'openspec' && call[1] === 'init'), false);
});

test('缺少 Codex 时在安装任何依赖前停止', () => {
  const runtime = createRuntime({ codexAvailable: false });
  assert.throws(() => initialize({
    target: runtime.target,
    cwd: runtime.root,
    home: runtime.root,
    platform: 'linux',
    exists: runtime.exists,
    run: runtime.run,
    log: () => {},
  }), /codex/);
  assert.equal(runtime.calls.some((call) => call[0] === 'npm' && call[1] === 'install'), false);
  assert.equal(runtime.calls.some((call) => call[0] === 'npx' && call.includes('mattpocock/skills')), false);
});

test('OCR安装失败时停止后续步骤', () => {
  const runtime = createRuntime({ ocrInstallSucceeds: false });
  assert.throws(() => initialize({
    target: runtime.target,
    cwd: runtime.root,
    home: runtime.root,
    platform: 'linux',
    exists: runtime.exists,
    run: runtime.run,
    log: () => {},
  }), /ocr/);
  assert.equal(runtime.calls.some((call) => call[0] === 'codex' && call.includes('marketplace')), false);
});

test('Windows 使用 PowerShell shim 且不启用 shell', () => {
  const env = { Path: 'C:\\tools', SystemRoot: 'C:\\Windows' };
  const result = resolveWindowsCommand('npm', env, (path) => path.endsWith('npm.ps1') || path.endsWith('powershell.exe'));
  assert.equal(result.command, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.deepEqual(result.prefix.slice(-2), ['-File', 'C:\\tools\\npm.ps1']);
});
