#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

async function json(relativePath) {
  try {
    return JSON.parse(await readFile(join(root, relativePath), 'utf8'));
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    return null;
  }
}

async function required(relativePath) {
  try {
    await access(join(root, relativePath));
  } catch {
    errors.push(`${relativePath}: missing`);
  }
}

function checkSkill(name) {
  return readFile(join(root, 'skills', name, 'SKILL.md'), 'utf8').then((content) => {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
      errors.push(`skills/${name}/SKILL.md: invalid frontmatter`);
      return;
    }
    if (!new RegExp(`^name:\\s*${name}\\s*$`, 'm').test(match[1])) errors.push(`skills/${name}/SKILL.md: name mismatch`);
    if (!/^description:\s*\S.+$/m.test(match[1])) errors.push(`skills/${name}/SKILL.md: description missing`);
    if (/TODO|TBD|PLACEHOLDER/.test(content)) errors.push(`skills/${name}/SKILL.md: unfinished placeholder`);
  }).catch((error) => errors.push(`skills/${name}/SKILL.md: ${error.message}`));
}

const plugin = await json('plugin.json');
const compatibility = await json('.codex-plugin/plugin.json');
const marketplace = await json('.agents/plugins/marketplace.json');
const dependencies = await json('external-skills.json');
const packageManifest = await json('package.json');

if (plugin) {
  if (plugin.name !== 'speclane') errors.push('plugin.json: name must be speclane');
  if (!/^\d+\.\d+\.\d+$/.test(plugin.version ?? '')) errors.push('plugin.json: version must be semver');
  if (plugin.$schema !== 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') errors.push('plugin.json: unsupported schema');
}
if (compatibility?.skills !== './skills/') errors.push('.codex-plugin/plugin.json: skills path must be ./skills/');
if (compatibility?.version !== plugin?.version) errors.push('.codex-plugin/plugin.json: version mismatch');
if (marketplace?.plugins?.[0]?.source?.path !== './') errors.push('.agents/plugins/marketplace.json: local source must point to ./');
if (packageManifest?.version !== plugin?.version) errors.push('package.json: version mismatch');
if (packageManifest?.bin?.SpecLane !== './bin/speclane.mjs') errors.push('package.json: SpecLane bin missing');
if (packageManifest?.bin?.speclane !== './bin/speclane.mjs') errors.push('package.json: speclane bin missing');
for (const skill of ['grill-with-docs', 'grilling', 'domain-modeling']) {
  if (!dependencies?.required?.includes(skill)) errors.push(`external-skills.json: missing ${skill}`);
}
if (!dependencies?.review?.required?.includes('open-code-review-delegate')) {
  errors.push('external-skills.json: missing open-code-review-delegate');
}
if (dependencies?.review?.cli_package !== '@alibaba-group/open-code-review') {
  errors.push('external-skills.json: missing OCR CLI package');
}

await Promise.all([checkSkill('speclane'), checkSkill('ui-parser')]);
const speclane = await readFile(join(root, 'skills', 'speclane', 'SKILL.md'), 'utf8');
for (const marker of ['`fast` is the default', 'state full', 'FULL_REQUIRED', 'Never upgrade automatically']) {
  if (!speclane.includes(marker)) errors.push(`skills/speclane/SKILL.md: missing ${marker}`);
}
const codeReview = await readFile(join(root, 'skills', 'speclane', 'references', 'code-review.md'), 'utf8');
for (const marker of ['ocr delegate preview', 'REVIEW_SCOPE_MISMATCH', 'code_review:native', 'code_review:ocr', '$open-code-review-delegate']) {
  if (!codeReview.includes(marker)) errors.push(`code-review.md: missing ${marker}`);
}
const finish = await readFile(join(root, 'skills', 'speclane', 'references', 'finish.md'), 'utf8');
for (const marker of ['openspec archive', 'state begin archive', 'state complete', 'openspec-strict']) {
  if (!finish.includes(marker)) errors.push(`finish.md: missing ${marker}`);
}
for (const path of [
  'skills/speclane/agents/openai.yaml',
  'skills/speclane/scripts/speclane.mjs',
  'skills/ui-parser/agents/openai.yaml',
  'skills/ui-parser/scripts/validate-ui-context.mjs',
  'bin/speclane.mjs',
  'README.md',
  'LICENSE',
]) await required(path);

if (errors.length) {
  process.stderr.write(`${JSON.stringify({ ok: false, errors }, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({ ok: true, plugin: plugin.name, version: plugin.version, skills: ['speclane', 'ui-parser'] }, null, 2)}\n`);
}
