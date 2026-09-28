import { z } from 'zod';
import { addOmniFocusTask } from '../primitives/addOmniFocusTask.js';
export const schema = z.object({
    name: z.string().describe("The name of the task"),
    note: z.string().optional().describe("Additional notes for the task"),
    dueDate: z.string().optional().describe("The due date of the task in ISO format (YYYY-MM-DD or full ISO date)"),
    deferDate: z.string().optional().describe("The defer date of the task in ISO format (YYYY-MM-DD or full ISO date)"),
    plannedDate: z.string().optional().describe("The planned date of the task in ISO format (YYYY-MM-DD or full ISO date). This is when you intend to work on the task, as distinct from when it is due."),
    flagged: z.boolean().optional().describe("Whether the task is flagged or not"),
    estimatedMinutes: z.number().optional().describe("Estimated time to complete the task, in minutes"),
    tags: z.array(z.string()).optional().describe("Tags to assign to the task"),
    projectName: z.string().optional().describe("The name of the project to add the task to (will add to inbox if not specified)"),
    parentTaskId: z.string().optional().describe("The ID of the parent task to create this task as a subtask"),
    parentTaskName: z.string().optional().describe("The name of the parent task to create this task as a subtask (alternative to parentTaskId)")
});
export async function handler(args, extra) {
    try {
        // Call the addOmniFocusTask function 
        const result = await addOmniFocusTask(args);
        if (result.success) {
            // Task was added successfully
            let locationText;
            if (args.parentTaskId || args.parentTaskName) {
                const parentRef = args.parentTaskId || args.parentTaskName;
                locationText = `as a subtask of "${parentRef}"`;
            }
            else if (args.projectName) {
                locationText = `in project "${args.projectName}"`;
            }
            else {
                locationText = "in your inbox";
            }
            let tagText = args.tags && args.tags.length > 0
                ? ` with tags: ${args.tags.join(', ')}`
                : "";
            let dueDateText = args.dueDate
                ? ` due on ${new Date(args.dueDate).toLocaleDateString()}`
                : "";
            return {
                content: [{
                        type: "text",
                        text: `✅ Task "${args.name}" created successfully ${locationText}${dueDateText}${tagText}.`
                    }]
            };
        }
        else {
            // Task creation failed
            return {
                content: [{
                        type: "text",
                        text: `Failed to create task: ${result.error}`
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
                    text: `Error creating task: ${error.message}`
                }],
            isError: true
        };
    }
}
