#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const UI_MODES = new Set(['none', 'existing', 'figma_preferred', 'figma_required']);

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateUiContext(data, { expectedChangeId } = {}) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['UI_CONTEXT_NOT_OBJECT'], warnings };
  }

  if (data.schema_version !== 1) errors.push('UNSUPPORTED_SCHEMA_VERSION');
  if (!nonEmptyString(data.change_id)) errors.push('CHANGE_ID_REQUIRED');
  if (expectedChangeId && data.change_id !== expectedChangeId) errors.push('CHANGE_ID_MISMATCH');
  if (!UI_MODES.has(data.ui_mode)) errors.push('INVALID_UI_MODE');

  const references = data.references;
  if (references !== undefined && !Array.isArray(references)) errors.push('REFERENCES_MUST_BE_ARRAY');

  if (data.ui_mode === 'none' || data.ui_mode === 'existing') {
    if (Array.isArray(references) && references.length > 0) warnings.push('FIGMA_REFERENCES_IGNORED');
    return { valid: errors.length === 0, errors, warnings, degraded: false };
  }

  const fallbackReason = data.fallback?.reason;
  if (!Array.isArray(references) || references.length === 0) {
    if (data.ui_mode === 'figma_preferred' && nonEmptyString(fallbackReason)) {
      warnings.push('FIGMA_FALLBACK_ACTIVE');
      return { valid: errors.length === 0, errors, warnings, degraded: true };
    }
    errors.push('FIGMA_REFERENCE_REQUIRED');
    return { valid: false, errors, warnings, degraded: false };
  }

  const ids = new Set();
  references.forEach((reference, index) => {
    const prefix = `REFERENCE_${index}`;
    if (!reference || typeof reference !== 'object' || Array.isArray(reference)) {
      errors.push(`${prefix}_NOT_OBJECT`);
      return;
    }
    if (!nonEmptyString(reference.id)) errors.push(`${prefix}_ID_REQUIRED`);
    if (ids.has(reference.id)) errors.push(`${prefix}_ID_DUPLICATE`);
    ids.add(reference.id);
    if (reference.provider !== 'figma') errors.push(`${prefix}_PROVIDER_MUST_BE_FIGMA`);
    if (!nonEmptyString(reference.url)) errors.push(`${prefix}_URL_REQUIRED`);
    if (!nonEmptyString(reference.file_key)) errors.push(`${prefix}_FILE_KEY_REQUIRED`);
    if (!nonEmptyString(reference.node_id)) errors.push(`${prefix}_NODE_ID_REQUIRED`);
    if (!Array.isArray(reference.requirement_ids)) errors.push(`${prefix}_REQUIREMENT_IDS_REQUIRED`);
    if (!Array.isArray(reference.states)) errors.push(`${prefix}_STATES_REQUIRED`);
    if (!Array.isArray(reference.responsive)) errors.push(`${prefix}_RESPONSIVE_REQUIRED`);

    const resolved = reference.validation_status === 'valid'
      && reference.parse_status === 'resolved'
      && nonEmptyString(reference.content_hash);
    if (!resolved) {
      if (data.ui_mode === 'figma_preferred' && nonEmptyString(fallbackReason)) {
        warnings.push(`${prefix}_FALLBACK_ACTIVE`);
      } else {
        errors.push(`${prefix}_EVIDENCE_INCOMPLETE`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    degraded: warnings.includes('FIGMA_FALLBACK_ACTIVE') || warnings.some((item) => item.endsWith('_FALLBACK_ACTIVE')),
  };
}

async function main() {
  const target = process.argv[2];
  if (!target) throw new Error('Usage: validate-ui-context.mjs <ui-context.json> [change-id]');
  const data = JSON.parse(await readFile(resolve(target), 'utf8'));
  const result = validateUiContext(data, { expectedChangeId: process.argv[3] });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.valid) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
