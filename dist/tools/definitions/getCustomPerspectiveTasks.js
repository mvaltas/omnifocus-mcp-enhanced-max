import { z } from 'zod';
import { getCustomPerspectiveTasks } from '../primitives/getCustomPerspectiveTasks.js';
export const schema = z.object({
    perspectiveName: z.string().describe("Exact name of the OmniFocus custom perspective. This is NOT a tag name."),
    hideCompleted: z.boolean().optional().describe("Whether to hide completed tasks. Set to false to show all tasks including completed ones (default: true)"),
    limit: z.number().optional().describe("Maximum number of tasks to return in flat view mode (default: 1000, ignored in hierarchy mode)"),
    showHierarchy: z.boolean().optional().describe("Display tasks in a hierarchical tree structure showing parent-child relationships (default: false)")
});
export async function handler(args, extra) {
    try {
        const result = await getCustomPerspectiveTasks({
            perspectiveName: args.perspectiveName,
            hideCompleted: args.hideCompleted !== false, // Default to true
            limit: args.limit || 1000,
            showHierarchy: args.showHierarchy || false // Default to false
        });
        return {
            content: [{
                    type: "text",
                    text: result
                }]
        };
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return {
            content: [{
                    type: "text",
                    text: `Error getting custom perspective tasks: ${errorMessage}`
                }],
            isError: true
        };
    }
}
