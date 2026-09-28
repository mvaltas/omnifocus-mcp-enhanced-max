import { describe, it, expect } from 'vitest';
import { escapeAppleScript, appleScriptFindByName } from './scriptExecution.js';
describe('escapeAppleScript', () => {
    it('should return plain strings unchanged', () => {
        expect(escapeAppleScript('hello world')).toBe('hello world');
    });
    it('should escape double quotes', () => {
        expect(escapeAppleScript('say "hello"')).toBe('say \\"hello\\"');
    });
    it("should NOT escape single quotes (they're safe inside double-quoted AppleScript strings)", () => {
        // Escaping `'` produced `\'`, which is not a real AppleScript escape and
        // could leave stray backslashes in stored values. Leaving apostrophes
        // alone is the correct behaviour.
        expect(escapeAppleScript("it's")).toBe("it's");
        expect(escapeAppleScript("Phu Nguyen's plan")).toBe("Phu Nguyen's plan");
    });
    it('should escape backslashes', () => {
        expect(escapeAppleScript('path\\to\\file')).toBe('path\\\\to\\\\file');
    });
    it('should escape backslash before other escapes (so we do not double-escape)', () => {
        // The raw input `\n` (backslash + n) must become `\\n` — a literal
        // backslash followed by the letter n — not `\\\n` (backslash + newline).
        expect(escapeAppleScript('\\n')).toBe('\\\\n');
    });
    it('should escape newlines', () => {
        // Multi-line notes used to break AppleScript string-literal parsing.
        expect(escapeAppleScript('line1\nline2')).toBe('line1\\nline2');
    });
    it('should escape carriage returns and tabs', () => {
        expect(escapeAppleScript('a\rb')).toBe('a\\rb');
        expect(escapeAppleScript('a\tb')).toBe('a\\tb');
    });
    it('should handle a realistic multi-line note with apostrophes and URLs', () => {
        const input = `Marco's plan\nLink: https://example.com/path\nDone`;
        const result = escapeAppleScript(input);
        // Apostrophe survives, newlines are escaped, URL passes through.
        expect(result).toBe(`Marco's plan\\nLink: https://example.com/path\\nDone`);
    });
    it('should handle empty string', () => {
        expect(escapeAppleScript('')).toBe('');
    });
});
describe('appleScriptFindByName', () => {
    it('emits an exact-match lookup as the first attempt', () => {
        const snippet = appleScriptFindByName('flattened task', 'My Task');
        expect(snippet).toContain('first flattened task where name = "My Task"');
    });
    it('falls back to a trailing-space variant', () => {
        const snippet = appleScriptFindByName('flattened task', 'My Task');
        expect(snippet).toContain('first flattened task where name = "My Task "');
    });
    it('falls back to a prefix scan that trims trailing whitespace', () => {
        const snippet = appleScriptFindByName('flattened task', 'My Task');
        expect(snippet).toContain('every flattened task where name starts with "My Task"');
        expect(snippet).toContain('repeat while');
        expect(snippet).toContain('trimmedName is "My Task"');
    });
    it('accepts an extra `whose` condition', () => {
        const snippet = appleScriptFindByName('flattened task', 'X', 'in inbox is false');
        expect(snippet).toContain('(name = "X" and in inbox is false)');
        expect(snippet).toContain('(name = "X " and in inbox is false)');
        expect(snippet).toContain('(name starts with "X" and in inbox is false)');
    });
    it('works for projects as well as tasks', () => {
        const snippet = appleScriptFindByName('flattened project', 'Payments Federation');
        expect(snippet).toContain('first flattened project where name = "Payments Federation"');
    });
});
