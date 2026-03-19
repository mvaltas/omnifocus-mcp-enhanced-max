import { describe, it, expect } from 'vitest';
import { generateAppleScript, validateParentTaskParams } from './addOmniFocusTask.js';
describe('validateParentTaskParams', () => {
    it('should return valid for task with no parent', () => {
        expect(validateParentTaskParams({ name: 'Task' })).toEqual({ valid: true });
    });
    it('should return valid for task with parentTaskId only', () => {
        expect(validateParentTaskParams({ name: 'Task', parentTaskId: 'abc123' })).toEqual({ valid: true });
    });
    it('should return valid for task with parentTaskName only', () => {
        expect(validateParentTaskParams({ name: 'Task', parentTaskName: 'Parent' })).toEqual({ valid: true });
    });
    it('should reject both parentTaskId and parentTaskName', () => {
        const result = validateParentTaskParams({ name: 'Task', parentTaskId: 'abc', parentTaskName: 'Parent' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('parentTaskId');
        expect(result.error).toContain('parentTaskName');
    });
    it('should reject parentTaskId combined with projectName', () => {
        const result = validateParentTaskParams({ name: 'Task', parentTaskId: 'abc', projectName: 'My Project' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('parent task');
        expect(result.error).toContain('project');
    });
    it('should reject parentTaskName combined with projectName', () => {
        const result = validateParentTaskParams({ name: 'Task', parentTaskName: 'Parent', projectName: 'My Project' });
        expect(result.valid).toBe(false);
    });
});
describe('generateAppleScript', () => {
    it('should include the task name in the script', () => {
        const script = generateAppleScript({ name: 'Buy groceries' });
        expect(script).toContain('Buy groceries');
    });
    it('should create an inbox task when no project or parent is specified', () => {
        const script = generateAppleScript({ name: 'Inbox task' });
        expect(script).toContain('make new inbox task');
    });
    it('should create a task in a project when projectName is provided', () => {
        const script = generateAppleScript({ name: 'Task', projectName: 'Work' });
        expect(script).toContain('flattened project where name = "Work"');
        // Project branch condition is active
        expect(script).toContain('"Work" is not ""');
    });
    it('should create a subtask by parentTaskId when provided', () => {
        const script = generateAppleScript({ name: 'Subtask', parentTaskId: 'task-id-123' });
        expect(script).toContain('flattened task where id = "task-id-123"');
        // Parent ID branch condition is active
        expect(script).toContain('"task-id-123" is not ""');
    });
    it('should create a subtask by parentTaskName when provided', () => {
        const script = generateAppleScript({ name: 'Subtask', parentTaskName: 'Parent Task' });
        expect(script).toContain('flattened task where name = "Parent Task"');
    });
    it('should set due date when provided', () => {
        const script = generateAppleScript({ name: 'Task', dueDate: '2026-03-20T00:00:00' });
        expect(script).toContain('set due date of newTask to dueDateVar');
        expect(script).toContain('set dueDateVar to current date');
    });
    it('should set defer date when provided', () => {
        const script = generateAppleScript({ name: 'Task', deferDate: '2026-03-15T00:00:00' });
        expect(script).toContain('set defer date of newTask to deferDateVar');
        expect(script).toContain('set deferDateVar to current date');
    });
    it('should not set dates when not provided', () => {
        const script = generateAppleScript({ name: 'Task' });
        expect(script).not.toContain('set due date');
        expect(script).not.toContain('set defer date');
    });
    it('should set flagged when true', () => {
        const script = generateAppleScript({ name: 'Task', flagged: true });
        expect(script).toContain('set flagged of newTask to true');
    });
    it('should not set flagged when false', () => {
        const script = generateAppleScript({ name: 'Task', flagged: false });
        expect(script).not.toContain('set flagged');
    });
    it('should set estimated minutes when provided', () => {
        const script = generateAppleScript({ name: 'Task', estimatedMinutes: 30 });
        expect(script).toContain('set estimated minutes of newTask to 30');
    });
    it('should add tags when provided', () => {
        const script = generateAppleScript({ name: 'Task', tags: ['@work', '@urgent'] });
        expect(script).toContain('flattened tag where name = "@work"');
        expect(script).toContain('flattened tag where name = "@urgent"');
    });
    it('should escape special characters in task name', () => {
        const script = generateAppleScript({ name: `Task with "quotes" and 'apostrophes'` });
        expect(script).toContain('\\"quotes\\"');
        expect(script).toContain("\\'apostrophes\\'");
    });
    it('should escape special characters in project name', () => {
        const script = generateAppleScript({ name: 'Task', projectName: `John's "Special" Project` });
        expect(script).toContain("John\\'s");
        expect(script).toContain('\\"Special\\"');
    });
    it('should set note when provided', () => {
        const script = generateAppleScript({ name: 'Task', note: 'Some notes here' });
        expect(script).toContain('set note of newTask to "Some notes here"');
    });
    it('should construct dates outside the tell block', () => {
        const script = generateAppleScript({ name: 'Task', dueDate: '2026-03-20T00:00:00' });
        const tellIndex = script.indexOf('tell application "OmniFocus"');
        const dueDateIndex = script.indexOf('set dueDateVar to current date');
        // Date construction must appear before the tell block
        expect(dueDateIndex).toBeLessThan(tellIndex);
    });
});
