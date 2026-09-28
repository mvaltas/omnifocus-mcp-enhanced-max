import { describe, it, expect } from 'vitest';
import { generateAppleScript } from './addProject.js';
describe('generateAppleScript (addProject)', () => {
    it('should include the project name in the script', () => {
        const script = generateAppleScript({ name: 'My Project' });
        expect(script).toContain('My Project');
    });
    it('should create project at root level when no folder specified', () => {
        const script = generateAppleScript({ name: 'My Project' });
        expect(script).toContain('make new project with properties {name:"My Project"}');
        // Root-level condition: folderName is empty, so the if-branch is taken
        expect(script).toContain('if "" is ""');
    });
    it('should create project in a folder when folderName is provided', () => {
        const script = generateAppleScript({ name: 'My Project', folderName: 'Work' });
        expect(script).toContain('flattened folder where name = "Work"');
        expect(script).toContain('at end of projects of theFolder');
    });
    it('should set due date when provided', () => {
        const script = generateAppleScript({ name: 'Project', dueDate: '2026-06-01T00:00:00' });
        expect(script).toContain('set due date of newProject to dueDateVar');
        expect(script).toContain('set dueDateVar to current date');
    });
    it('should set defer date when provided', () => {
        const script = generateAppleScript({ name: 'Project', deferDate: '2026-05-01T00:00:00' });
        expect(script).toContain('set defer date of newProject to deferDateVar');
    });
    it('should not set dates when not provided', () => {
        const script = generateAppleScript({ name: 'Project' });
        expect(script).not.toContain('set due date');
        expect(script).not.toContain('set defer date');
    });
    it('should set sequential to true', () => {
        const script = generateAppleScript({ name: 'Project', sequential: true });
        expect(script).toContain('set sequential of newProject to true');
    });
    it('should set sequential to false by default', () => {
        const script = generateAppleScript({ name: 'Project' });
        expect(script).toContain('set sequential of newProject to false');
    });
    it('should set flagged when true', () => {
        const script = generateAppleScript({ name: 'Project', flagged: true });
        expect(script).toContain('set flagged of newProject to true');
    });
    it('should set note when provided', () => {
        const script = generateAppleScript({ name: 'Project', note: 'Important project' });
        expect(script).toContain('set note of newProject to "Important project"');
    });
    it('should set estimated minutes when provided', () => {
        const script = generateAppleScript({ name: 'Project', estimatedMinutes: 120 });
        expect(script).toContain('set estimated minutes of newProject to 120');
    });
    it('should add tags when provided', () => {
        const script = generateAppleScript({ name: 'Project', tags: ['@work', '@client'] });
        expect(script).toContain('flattened tag where name = "@work"');
        expect(script).toContain('flattened tag where name = "@client"');
    });
    it('should escape special characters in project name', () => {
        const script = generateAppleScript({ name: `Alice's "Big" Plan` });
        // Apostrophes pass through unescaped (safe inside double-quoted strings).
        expect(script).toContain("Alice's");
        expect(script).toContain('\\"Big\\"');
    });
    it('should construct dates outside the tell block', () => {
        const script = generateAppleScript({ name: 'Project', dueDate: '2026-06-01T00:00:00' });
        const tellIndex = script.indexOf('tell application "OmniFocus"');
        const dueDateIndex = script.indexOf('set dueDateVar to current date');
        expect(dueDateIndex).toBeLessThan(tellIndex);
    });
});
