import { z } from 'zod';
import { getApiDeclarations, DEFAULT_MAX_CHARS } from '../primitives/getApiDeclarations.js';
export const schema = z.object({
    filter: z.string().optional().describe("Term to search the API for, such as a class name (\"Task\"), a property (\"plannedDate\") or a concept (\"review\"). Omit to request the entire API, which is very large and will be truncated."),
    maxChars: z.number().int().positive().optional().describe(`Maximum characters of declarations to return (default: ${DEFAULT_MAX_CHARS})`)
});
export async function handler(args, extra) {
    try {
        const result = await getApiDeclarations({ filter: args.filter, maxChars: args.maxChars });
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
                    text: `Error looking up the OmniFocus API: ${errorMessage}`
                }],
            isError: true
        };
    }
}
