#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VERSION = '0.5.0';
export const CLARIFICATION_SKILLS = ['grill-with-docs', 'grilling', 'domain-modeling'];
export const REVIEW_SKILL = 'open-code-review-delegate';
export const REQUIRED_SKILLS = [...CLARIFICATION_SKILLS, REVIEW_SKILL];

const MARKETPLACE_NAME = 'speclane-marketplace';
const MARKETPLACE_URL = 'https://gitee.com/fool1582/SpecLane.git';
const PLUGIN_ID = `speclane@${MARKETPLACE_NAME}`;

export function isMainModule(entryPath, modulePath, realpath = realpathSync) {
  return Boolean(entryPath) && realpath(resolve(entryPath)) === realpath(modulePath);
}

export function resolveWindowsCommand(name, env = process.env, exists = existsSync) {
  const pathValue = env.Path || env.PATH || '';
  for (const directory of pathValue.split(';').map((item) => item.replace(/^"|"$/g, '')).filter(Boolean)) {
    const executablePath = win32.join(directory, `${name}.exe`);
    if (exists(executablePath)) return { command: executablePath, prefix: [] };
    const scriptPath = win32.join(directory, `${name}.ps1`);
    if (exists(scriptPath)) {
      const systemRoot = env.SystemRoot || env.SYSTEMROOT || 'C:\\Windows';
      const powershell = win32.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      return {
        command: exists(powershell) ? powershell : 'powershell.exe',
        prefix: ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      };
    }
  }
  return { command: name, prefix: [] };
}

function defaultRunner(platform, cwd, env, exists) {
  return (command, args, { capture = false } = {}) => {
    const invocation = platform === 'win32'
      ? resolveWindowsCommand(command, env, exists)
      : { command, prefix: [] };
    return spawnSync(invocation.command, [...invocation.prefix, ...args], {
      cwd,
      encoding: 'utf8',
      shell: false,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
  };
}

function ok(result) {
  return !result.error && result.status === 0;
}

function detail(result) {
  return String(result.stderr || result.stdout || result.error?.message || '').trim();
}

function requireCommand(run, command) {
  const result = run(command, ['--version'], { capture: true });
  if (!ok(result)) throw new Error(`缺少必需命令：${command}`);
}

function runRequired(run, label, command, args) {
  const result = run(command, args);
  if (!ok(result)) throw new Error(`${label}失败${detail(result) ? `：${detail(result)}` : ''}`);
}

function readJson(run, label, command, args) {
  const result = run(command, args, { capture: true });
  if (!ok(result)) throw new Error(`${label}失败${detail(result) ? `：${detail(result)}` : ''}`);
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label}返回了无效 JSON`);
  }
}

function assertNodeVersion(version) {
  const [major = 0, minor = 0] = version.split('.').map(Number);
  if (major < 20 || (major === 20 && minor < 19)) {
    throw new Error(`Node.js ${version} 不受支持，需要 20.19.0 或更高版本`);
  }
}

function skillPaths(name, env, home) {
  const codexHome = env.CODEX_HOME || join(home, '.codex');
  return [
    join(codexHome, 'skills', name, 'SKILL.md'),
    join(home, '.agents', 'skills', name, 'SKILL.md'),
  ];
}

export function initialize({
  target = '.',
  cwd = process.cwd(),
  env = process.env,
  home = homedir(),
  platform = process.platform,
  nodeVersion = process.versions.node,
  exists = existsSync,
  mkdir = mkdirSync,
  run = defaultRunner(platform, cwd, env, exists),
  log = (message) => process.stdout.write(`${message}\n`),
} = {}) {
  assertNodeVersion(nodeVersion);
  for (const command of ['npm', 'npx', 'git', 'codex']) requireCommand(run, command);

  log('✓ Node.js、npm、npx、Git 和 Codex 已就绪');

  if (!ok(run('openspec', ['--version'], { capture: true }))) {
    log('→ 安装 OpenSpec');
    runRequired(run, 'OpenSpec 安装', 'npm', ['install', '--global', '@fission-ai/openspec@latest']);
    requireCommand(run, 'openspec');
  } else {
    log('✓ OpenSpec 已安装');
  }

  const missingSkills = CLARIFICATION_SKILLS.filter((name) => !skillPaths(name, env, home).some(exists));
  if (missingSkills.length) {
    log(`→ 安装澄清 Skill：${missingSkills.join('、')}`);
    runRequired(run, '外部 Skill 安装', 'npx', [
      '--yes', 'skills@latest', 'add', 'mattpocock/skills',
      '--global', '--agent', 'codex', '--skill', ...missingSkills, '--yes', '--copy',
    ]);
    const stillMissing = missingSkills.filter((name) => !skillPaths(name, env, home).some(exists));
    if (stillMissing.length) throw new Error(`外部 Skill 安装后仍不可用：${stillMissing.join('、')}`);
  } else {
    log('✓ 三个澄清 Skill 已安装');
  }

  if (!ok(run('ocr', ['--version'], { capture: true }))) {
    log('→ 安装 Open Code Review CLI');
    runRequired(run, 'Open Code Review CLI 安装', 'npm', [
      'install', '--global', '@alibaba-group/open-code-review@latest',
    ]);
    requireCommand(run, 'ocr');
  } else {
    log('✓ Open Code Review CLI 已安装');
  }
  if (!ok(run('ocr', ['delegate', 'preview', '--help'], { capture: true }))) {
    throw new Error('Open Code Review Delegation Mode 不可用');
  }

  if (!skillPaths(REVIEW_SKILL, env, home).some(exists)) {
    log(`→ 安装审查 Skill：${REVIEW_SKILL}`);
    runRequired(run, '审查 Skill 安装', 'npx', [
      '--yes', 'skills@latest', 'add', 'alibaba/open-code-review',
      '--global', '--agent', 'codex', '--skill', REVIEW_SKILL, '--yes', '--copy',
    ]);
    if (!skillPaths(REVIEW_SKILL, env, home).some(exists)) {
      throw new Error(`审查 Skill 安装后仍不可用：${REVIEW_SKILL}`);
    }
  } else {
    log('✓ Open Code Review 审查 Skill 已安装');
  }

  const marketplaces = readJson(run, 'Marketplace 检查', 'codex', ['plugin', 'marketplace', 'list', '--json']);
  if (!marketplaces.marketplaces?.some((item) => item.name === MARKETPLACE_NAME)) {
    log('→ 添加 SpecLane Marketplace');
    runRequired(run, 'Marketplace 添加', 'codex', ['plugin', 'marketplace', 'add', MARKETPLACE_URL, '--json']);
  } else {
    log('✓ SpecLane Marketplace 已添加');
  }

  let plugins = readJson(run, '插件检查', 'codex', ['plugin', 'list', '--marketplace', MARKETPLACE_NAME, '--json']);
  if (!plugins.installed?.some((item) => item.pluginId === PLUGIN_ID && item.enabled)) {
    log('→ 安装 SpecLane 插件');
    runRequired(run, 'SpecLane 插件安装', 'codex', ['plugin', 'add', PLUGIN_ID, '--json']);
    plugins = readJson(run, '插件复查', 'codex', ['plugin', 'list', '--marketplace', MARKETPLACE_NAME, '--json']);
    if (!plugins.installed?.some((item) => item.pluginId === PLUGIN_ID && item.enabled)) {
      throw new Error('SpecLane 插件安装后仍未启用');
    }
  } else {
    log('✓ SpecLane 插件已安装并启用');
  }

  const targetPath = resolve(cwd, target);
  if (exists(join(targetPath, 'openspec', 'config.yaml'))) {
    log(`✓ 项目已经初始化：${targetPath}`);
    return { target: targetPath, initialized: false };
  }

  mkdir(targetPath, { recursive: true });
  log(`→ 初始化项目：${targetPath}`);
  runRequired(run, '项目初始化', 'openspec', [
    'init', targetPath, '--tools', 'codex', '--language', 'zh-CN', '--no-animation',
  ]);
  log('✓ SpecLane 初始化完成，请重新打开 Codex 会话以刷新 Skill 列表');
  return { target: targetPath, initialized: true };
}

export function runCli(argv = process.argv.slice(2), options = {}) {
  const [command, target, ...extra] = argv;
  if (!command || command === '--help' || command === '-h') {
    process.stdout.write(`SpecLane ${VERSION}\n\n用法：\n  SpecLane init [目录]\n`);
    return;
  }
  if (command === '--version' || command === '-v') {
    process.stdout.write(`${VERSION}\n`);
    return;
  }
  if (command !== 'init' || extra.length) throw new Error('用法：SpecLane init [目录]');
  return initialize({ ...options, target: target || '.' });
}

if (isMainModule(process.argv[1], fileURLToPath(import.meta.url))) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`SpecLane init 失败：${error.message}\n`);
    process.exitCode = 1;
  }
}
