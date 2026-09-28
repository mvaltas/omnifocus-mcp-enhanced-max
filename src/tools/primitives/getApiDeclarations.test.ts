import { describe, it, expect } from 'vitest';
import { stripPreamble, formatDeclarations, DEFAULT_MAX_CHARS } from './getApiDeclarations.js';

// A faithful miniature of what getTypeScriptDeclarations() actually returns:
// a version line, boilerplate instructions, then the declarations.
const PREAMBLE = [
  '// TypeScript definitions for OmniFocus 4.9 (187.2.1) on macOS 26.7',
  '// Generated on 2026-09-28 17:04:54 +0000 -- Filtered by "Tag"',
  '',
  '// To use these definitions, save this file as `OmniFocus.d.ts`',
  '// and create a `tsconfig.json` file with compiler settings.',
  '',
  ''
].join('\n');

const WITH_BODY = PREAMBLE + ['// Tag', '', 'declare class Tag {', '    name: string;', '}'].join('\n');

describe('stripPreamble', () => {
  it('keeps the version line and drops the boilerplate', () => {
    const { version, body } = stripPreamble(WITH_BODY);
    expect(version).toBe('TypeScript definitions for OmniFocus 4.9 (187.2.1) on macOS 26.7');
    expect(body).not.toContain('save this file as');
    expect(body).toContain('declare class Tag');
  });

  it('keeps the section comment directly above a declaration', () => {
    expect(stripPreamble(WITH_BODY).body.startsWith('// Tag')).toBe(true);
  });

  it('returns an empty body when the filter matched nothing', () => {
    // A filter matching nothing still returns the full preamble.
    expect(stripPreamble(PREAMBLE).body).toBe('');
  });

  it('handles an empty string', () => {
    expect(stripPreamble('')).toEqual({ version: '', body: '' });
  });
});

describe('formatDeclarations', () => {
  it('reports no match when only the preamble came back', () => {
    const out = formatDeclarations({ filter: 'zzz', declarations: PREAMBLE }, DEFAULT_MAX_CHARS);
    expect(out).toContain('No API or documentation matched');
    expect(out).not.toContain('```');
  });

  it('returns the body in a typescript fence when it fits', () => {
    const out = formatDeclarations({ filter: 'Tag', declarations: WITH_BODY }, DEFAULT_MAX_CHARS);
    expect(out).toContain('```typescript');
    expect(out).toContain('declare class Tag');
    expect(out).not.toContain('Showing the first');
  });

  it('truncates and says so when the body exceeds maxChars', () => {
    const out = formatDeclarations({ filter: 'Tag', declarations: WITH_BODY }, 10);
    expect(out).toContain('Showing the first 10 of');
    expect(out).toContain('Narrow the filter');
  });

  it('describes an absent filter as the entire API', () => {
    const out = formatDeclarations({ declarations: WITH_BODY }, DEFAULT_MAX_CHARS);
    expect(out).toContain('for the entire API');
  });

  it('names the filter it was given', () => {
    const out = formatDeclarations({ filter: 'plannedDate', declarations: WITH_BODY }, DEFAULT_MAX_CHARS);
    expect(out).toContain('matching "plannedDate"');
  });
});
