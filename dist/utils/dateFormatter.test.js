import { describe, it, expect } from 'vitest';
import { formatDateForAppleScript } from './dateFormatter.js';
describe('formatDateForAppleScript', () => {
    describe('basic date formatting', () => {
        it('should convert ISO date string with explicit time to AppleScript date construction', () => {
            // Use explicit midnight time to ensure consistent behavior across timezones
            const result = formatDateForAppleScript('2026-01-28T00:00:00');
            // Verify all required statements are present
            expect(result).toContain('set tempDate to current date');
            expect(result).toContain('set year of tempDate to 2026');
            expect(result).toContain('set month of tempDate to 1');
            expect(result).toContain('set day of tempDate to 28');
            expect(result).toContain('set time of tempDate to 0');
        });
        it('should handle ISO date with time component', () => {
            const result = formatDateForAppleScript('2026-01-28T14:30:00');
            // 14:30:00 = 14*3600 + 30*60 + 0 = 50400 + 1800 = 52200 seconds
            expect(result).toContain('set tempDate to current date');
            expect(result).toContain('set year of tempDate to 2026');
            expect(result).toContain('set month of tempDate to 1');
            expect(result).toContain('set day of tempDate to 28');
            expect(result).toContain('set time of tempDate to 52200');
        });
        it('should handle different months and days correctly', () => {
            const result = formatDateForAppleScript('2025-12-31T00:00:00');
            expect(result).toContain('set year of tempDate to 2025');
            expect(result).toContain('set month of tempDate to 12');
            expect(result).toContain('set day of tempDate to 31');
            expect(result).toContain('set time of tempDate to 0');
        });
    });
    describe('custom variable name', () => {
        it('should use custom variable name when provided', () => {
            const result = formatDateForAppleScript('2026-01-28T00:00:00', 'dueDateVar');
            expect(result).toContain('set dueDateVar to current date');
            expect(result).toContain('set year of dueDateVar to 2026');
            expect(result).toContain('set month of dueDateVar to 1');
            expect(result).toContain('set day of dueDateVar to 28');
            expect(result).toContain('set time of dueDateVar to 0');
            // Should not contain default variable name
            expect(result).not.toContain('tempDate');
        });
        it('should allow different variable names for multiple dates', () => {
            const dueDate = formatDateForAppleScript('2026-01-28T00:00:00', 'dueDate');
            const deferDate = formatDateForAppleScript('2026-01-20T00:00:00', 'deferDate');
            expect(dueDate).toContain('dueDate');
            expect(deferDate).toContain('deferDate');
            expect(dueDate).not.toContain('deferDate');
            expect(deferDate).not.toContain('dueDate');
        });
    });
    describe('error handling', () => {
        it('should throw error for empty string', () => {
            expect(() => formatDateForAppleScript('')).toThrow('Date string cannot be empty');
        });
        it('should throw error for whitespace-only string', () => {
            expect(() => formatDateForAppleScript('   ')).toThrow('Date string cannot be empty');
        });
        it('should throw error for invalid date string', () => {
            expect(() => formatDateForAppleScript('not-a-date')).toThrow('Invalid date string');
        });
        it('should throw error for malformed ISO date', () => {
            expect(() => formatDateForAppleScript('2026-13-45')).toThrow('Invalid date string');
        });
    });
    describe('time calculations', () => {
        it('should correctly calculate time at midnight', () => {
            const result = formatDateForAppleScript('2026-01-28T00:00:00');
            expect(result).toContain('set time of tempDate to 0');
        });
        it('should correctly calculate time at noon', () => {
            // 12:00:00 = 12*3600 = 43200 seconds
            const result = formatDateForAppleScript('2026-01-28T12:00:00');
            expect(result).toContain('set time of tempDate to 43200');
        });
        it('should correctly calculate time with hours, minutes, and seconds', () => {
            // 15:45:30 = 15*3600 + 45*60 + 30 = 54000 + 2700 + 30 = 56730 seconds
            const result = formatDateForAppleScript('2026-01-28T15:45:30');
            expect(result).toContain('set time of tempDate to 56730');
        });
    });
    describe('output format', () => {
        it('should return statements separated by newlines', () => {
            const result = formatDateForAppleScript('2026-01-28T00:00:00');
            const lines = result.split('\n');
            expect(lines).toHaveLength(5);
            expect(lines[0]).toBe('set tempDate to current date');
            expect(lines[1]).toBe('set year of tempDate to 2026');
            expect(lines[2]).toBe('set month of tempDate to 1');
            expect(lines[3]).toBe('set day of tempDate to 28');
            expect(lines[4]).toBe('set time of tempDate to 0');
        });
        it('should set year before month before day (correct order)', () => {
            const result = formatDateForAppleScript('2026-02-29'); // Invalid date, but tests order
            const lines = result.split('\n');
            // Find indices of year, month, and day statements
            const yearIndex = lines.findIndex(line => line.includes('set year'));
            const monthIndex = lines.findIndex(line => line.includes('set month'));
            const dayIndex = lines.findIndex(line => line.includes('set day'));
            // Year should come before month should come before day
            expect(yearIndex).toBeLessThan(monthIndex);
            expect(monthIndex).toBeLessThan(dayIndex);
        });
    });
});
