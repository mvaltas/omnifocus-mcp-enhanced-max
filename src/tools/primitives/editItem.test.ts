import { describe, it, expect } from 'vitest';
import { generateAppleScript } from './editItem.js';

describe('generateAppleScript (editItem)', () => {
  it('should return an error script when neither id nor name is provided', () => {
    const script = generateAppleScript({ itemType: 'task' });
    expect(script).toContain('success');
    expect(script).toContain('false');
    expect(script).toContain('Either id or name must be provided');
  });

  it('should search by id when provided', () => {
    const script = generateAppleScript({ id: 'abc-123', itemType: 'task' });
    expect(script).toContain('flattened task where id = "abc-123"');
  });

  it('should search by name when only name is provided, preferring non-inbox tasks', () => {
    const script = generateAppleScript({ name: 'My Task', itemType: 'task' });
    expect(script).toContain('flattened task where (name = "My Task" and in inbox is false)');
    // Falls back to searching all tasks including inbox
    expect(script).toContain('first flattened task where name = "My Task"');
  });

  it('should emit whitespace-tolerant fallbacks for name lookup', () => {
    const script = generateAppleScript({ name: 'My Task', itemType: 'task' });
    // Trailing-space variant catches the common OF case where the task name
    // got stored with a stray trailing space.
    expect(script).toContain('flattened task where name = "My Task "');
    // Trim-tolerant scan handles arbitrary trailing whitespace.
    expect(script).toContain('every flattened task where name starts with "My Task"');
  });

  it('should use flattened project for project type', () => {
    const script = generateAppleScript({ id: 'proj-1', itemType: 'project' });
    expect(script).toContain('flattened project where id = "proj-1"');
  });

  it('should update name when newName is provided', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newName: 'New Name' });
    expect(script).toContain('set name of foundItem to "New Name"');
  });

  it('should update note when newNote is provided', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newNote: 'Updated note' });
    expect(script).toContain('set note of foundItem to "Updated note"');
  });

  it('should set due date when newDueDate is provided', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newDueDate: '2026-04-01T00:00:00' });
    expect(script).toContain('set due date of foundItem to dueDateVar');
    expect(script).toContain('set dueDateVar to current date');
  });

  it('should clear due date when newDueDate is empty string', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newDueDate: '' });
    expect(script).toContain('set due date of foundItem to missing value');
  });

  it('should set planned date when newPlannedDate is provided', () => {
    const script = generateAppleScript({ id: '123', itemType: 'task', newPlannedDate: '2026-03-15T00:00:00' });
    expect(script).toContain('set planned date of foundItem to plannedDateVar');
  });

  it('should clear planned date when newPlannedDate is empty string', () => {
    const script = generateAppleScript({ id: '123', itemType: 'task', newPlannedDate: '' });
    expect(script).toContain('set planned date of foundItem to missing value');
  });

  it('should set defer date when newDeferDate is provided', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newDeferDate: '2026-03-25T00:00:00' });
    expect(script).toContain('set defer date of foundItem to deferDateVar');
  });

  it('should clear defer date when newDeferDate is empty string', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newDeferDate: '' });
    expect(script).toContain('set defer date of foundItem to missing value');
  });

  it('should set flagged status', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newFlagged: true });
    expect(script).toContain('set flagged of foundItem to true');
  });

  it('should set estimated minutes', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newEstimatedMinutes: 45 });
    expect(script).toContain('set estimated minutes of foundItem to 45');
  });

  it('should mark task as completed', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newStatus: 'completed' });
    expect(script).toContain('mark complete foundItem');
  });

  it('should mark task as dropped', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newStatus: 'dropped' });
    expect(script).toContain('set dropped of foundItem to true');
  });

  it('should mark task as incomplete', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newStatus: 'incomplete' });
    expect(script).toContain('mark incomplete foundItem');
  });

  it('should move task to a new project', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newProjectName: 'Work' });
    expect(script).toContain('flattened project where name = "Work"');
    expect(script).toContain('move foundItem to end of tasks of destProject');
  });

  it('should move task to top of its containing project', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newPositionInProject: 'top' });
    expect(script).toContain('set itemProject to containing project of foundItem');
    expect(script).toContain('move foundItem to beginning of tasks of itemProject');
  });

  it('should move task to bottom of its containing project', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newPositionInProject: 'bottom' });
    expect(script).toContain('move foundItem to end of tasks of itemProject');
  });

  it('should replace all tags', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', replaceTags: ['@home', '@urgent'] });
    expect(script).toContain('"@home"');
    expect(script).toContain('"@urgent"');
    expect(script).toContain('remove existingTag from tags of foundItem');
  });

  it('should add specified tags', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', addTags: ['@work'] });
    expect(script).toContain('"@work"');
    expect(script).toContain('add tagObj to tags of foundItem');
  });

  it('should remove specified tags', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', removeTags: ['@old'] });
    expect(script).toContain('"@old"');
    expect(script).toContain('remove tagObj from tags of foundItem');
  });

  it('should update project sequential status', () => {
    const script = generateAppleScript({ id: 'proj', itemType: 'project', newSequential: true });
    expect(script).toContain('set sequential of foundItem to true');
  });

  it('should update project status to active', () => {
    const script = generateAppleScript({ id: 'proj', itemType: 'project', newProjectStatus: 'active' });
    expect(script).toContain('set status of foundItem to active status');
  });

  it('should update project status to completed', () => {
    const script = generateAppleScript({ id: 'proj', itemType: 'project', newProjectStatus: 'completed' });
    expect(script).toContain('set status of foundItem to done status');
  });

  it('should update project status to onHold', () => {
    const script = generateAppleScript({ id: 'proj', itemType: 'project', newProjectStatus: 'onHold' });
    expect(script).toContain('set status of foundItem to on hold status');
  });

  it('should move project to a folder', () => {
    const script = generateAppleScript({ id: 'proj', itemType: 'project', newFolderName: 'Area' });
    expect(script).toContain('flattened folder where name = "Area"');
    expect(script).toContain('move foundItem to destFolder');
  });

  it('should escape special characters in newName', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newName: `"Quoted" task` });
    expect(script).toContain('\\"Quoted\\"');
  });

  it('should construct dates outside the tell block', () => {
    const script = generateAppleScript({ id: 'abc', itemType: 'task', newDueDate: '2026-04-01T00:00:00' });
    const tellIndex = script.indexOf('tell application "OmniFocus"');
    const dueDateIndex = script.indexOf('set dueDateVar to current date');
    expect(dueDateIndex).toBeLessThan(tellIndex);
  });
});
