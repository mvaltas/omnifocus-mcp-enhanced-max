import { describe, it, expect } from 'vitest';
import { generateAppleScript } from './removeItem.js';
describe('generateAppleScript (removeItem)', () => {
    it('should return an error script when neither id nor name is provided', () => {
        const script = generateAppleScript({ itemType: 'task' });
        expect(script).toContain('success');
        expect(script).toContain('false');
        expect(script).toContain('Either id or name must be provided');
    });
    it('should search by id when id is provided', () => {
        const script = generateAppleScript({ id: 'abc-123', itemType: 'task' });
        expect(script).toContain('flattened task where id = "abc-123"');
    });
    it('should search by name when only name is provided', () => {
        const script = generateAppleScript({ name: 'My Task', itemType: 'task' });
        expect(script).toContain('flattened task where name = "My Task"');
        expect(script).not.toContain('where id');
    });
    it('should search by id first, then name as fallback when both provided', () => {
        const script = generateAppleScript({ id: 'abc', name: 'My Task', itemType: 'task' });
        expect(script).toContain('where id = "abc"');
        expect(script).toContain('where name = "My Task"');
        const idIndex = script.indexOf('where id =');
        const nameIndex = script.indexOf('where name =');
        expect(idIndex).toBeLessThan(nameIndex);
    });
    it('should use flattened project for project type', () => {
        const script = generateAppleScript({ id: 'proj-1', itemType: 'project' });
        expect(script).toContain('flattened project where id = "proj-1"');
        expect(script).not.toContain('flattened task');
    });
    it('should include delete command', () => {
        const script = generateAppleScript({ id: 'abc', itemType: 'task' });
        expect(script).toContain('delete foundItem');
    });
    it('should escape special characters in id', () => {
        const script = generateAppleScript({ id: 'id"with"quotes', itemType: 'task' });
        expect(script).toContain('\\"with\\"');
    });
    it('should escape special characters in name', () => {
        const script = generateAppleScript({ name: `Task's "Name"`, itemType: 'task' });
        // Apostrophes are safe inside double-quoted AppleScript strings and are
        // intentionally NOT escaped (escaping them used to leave stray backslashes
        // in stored values).
        expect(script).toContain("Task's");
        expect(script).toContain('\\"Name\\"');
    });
    it('should handle item not found with an error response', () => {
        const script = generateAppleScript({ id: 'xyz', itemType: 'task' });
        expect(script).toContain('Item not found');
    });
});
