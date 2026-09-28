import { z } from 'zod';
import { editItem } from '../primitives/editItem.js';
export const schema = z.object({
    id: z.string().optional().describe("The ID of the task or project to edit"),
    name: z.string().optional().describe("The name of the task or project to edit (as fallback if ID not provided)"),
    itemType: z.enum(['task', 'project']).describe("Type of item to edit ('task' or 'project')"),
    // Common editable fields
    newName: z.string().optional().describe("New name for the item"),
    newNote: z.string().optional().describe("New note for the item"),
    newDueDate: z.string().optional().describe("New due date in ISO format (YYYY-MM-DD or full ISO date); set to empty string to clear"),
    newDeferDate: z.string().optional().describe("New defer date in ISO format (YYYY-MM-DD or full ISO date); set to empty string to clear"),
    newPlannedDate: z.string().optional().describe("New planned date in ISO format (YYYY-MM-DD or full ISO date); set to empty string to clear. The planned date is when you intend to work on the item, as distinct from when it is due."),
    newFlagged: z.boolean().optional().describe("Set flagged status (set to false for no flag, true for flag)"),
    newEstimatedMinutes: z.number().optional().describe("New estimated minutes"),
    // Task-specific fields
    newStatus: z.enum(['incomplete', 'completed', 'dropped']).optional().describe("New status for tasks (incomplete, completed, dropped)"),
    newProjectName: z.string().optional().describe("Move task to a different project (use exact project name with emoji)"),
    addTags: z.array(z.string()).optional().describe("Tags to add to the task"),
    removeTags: z.array(z.string()).optional().describe("Tags to remove from the task"),
    replaceTags: z.array(z.string()).optional().describe("Tags to replace all existing tags with"),
    // Project-specific fields
    newSequential: z.boolean().optional().describe("Whether the project should be sequential"),
    newFolderName: z.string().optional().describe("New folder to move the project to"),
    newProjectStatus: z.enum(['active', 'completed', 'dropped', 'onHold']).optional().describe("New status for projects"),
    // Position within containing project (task only)
    newPositionInProject: z.enum(['top', 'bottom']).optional().describe("For tasks: move the task to the top or bottom of its containing project's task list. Use 'top' to designate the day's MIT (most-important-task convention). Operates on the containing project; for a subtask this moves it out of its parent.")
});
export async function handler(args, extra) {
    try {
        // Validate that either id or name is provided
        if (!args.id && !args.name) {
            return {
                content: [{
                        type: "text",
                        text: "Either id or name must be provided to edit an item."
                    }],
                isError: true
            };
        }
        // Call the editItem function 
        const result = await editItem(args);
        if (result.success) {
            // Item was edited successfully
            const itemTypeLabel = args.itemType === 'task' ? 'Task' : 'Project';
            let changedText = '';
            if (result.changedProperties) {
                changedText = ` (${result.changedProperties})`;
            }
            return {
                content: [{
                        type: "text",
                        text: `✅ ${itemTypeLabel} "${result.name}" updated successfully${changedText}.`
                    }]
            };
        }
        else {
            // Item editing failed
            let errorMsg = `Failed to update ${args.itemType}`;
            if (result.error) {
                if (result.error.includes("Item not found")) {
                    errorMsg = `${args.itemType.charAt(0).toUpperCase() + args.itemType.slice(1)} not found`;
                    if (args.id)
                        errorMsg += ` with ID "${args.id}"`;
                    if (args.name)
                        errorMsg += `${args.id ? ' or' : ' with'} name "${args.name}"`;
                    errorMsg += '.';
                }
                else {
                    errorMsg += `: ${result.error}`;
                }
            }
            return {
                content: [{
                        type: "text",
                        text: errorMsg
                    }],
                isError: true
            };
        }
    }
    catch (err) {
        const error = err;
        console.error(`Tool execution error: ${error.message}`);
        return {
            content: [{
                    type: "text",
                    text: `Error updating ${args.itemType}: ${error.message}`
                }],
            isError: true
        };
    }
}
