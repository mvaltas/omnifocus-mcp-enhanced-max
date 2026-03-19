import { describe, it, expect } from 'vitest';
import { escapeAppleScript } from './scriptExecution.js';
describe('escapeAppleScript', () => {
    it('should return plain strings unchanged', () => {
        expect(escapeAppleScript('hello world')).toBe('hello world');
    });
    it('should escape double quotes', () => {
        expect(escapeAppleScript('say "hello"')).toBe('say \\"hello\\"');
    });
    it('should escape single quotes', () => {
        expect(escapeAppleScript("it's")).toBe("it\\'s");
    });
    it('should escape backslashes', () => {
        expect(escapeAppleScript('path\\to\\file')).toBe('path\\\\to\\\\file');
    });
    it('should escape all special characters together', () => {
        const input = `"quoted" and 'apos' and back\\slash`;
        const result = escapeAppleScript(input);
        expect(result).toContain('\\"quoted\\"');
        expect(result).toContain("\\'apos\\'");
        expect(result).toContain('back\\\\slash');
    });
    it('should handle empty string', () => {
        expect(escapeAppleScript('')).toBe('');
    });
});
