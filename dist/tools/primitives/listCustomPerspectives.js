import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
export async function listCustomPerspectives(options = {}) {
    const { format = 'simple' } = options;
    try {
        // Execute the list custom perspectives script
        const result = await executeOmniFocusScript('@listCustomPerspectives.js', {});
        let data;
        if (typeof result === 'string') {
            try {
                data = JSON.parse(result);
            }
            catch (parseError) {
                throw new Error(`Failed to parse string result: ${result}`);
            }
        }
        else if (typeof result === 'object' && result !== null) {
            data = result;
        }
        else {
            throw new Error(`Script returned an invalid result type: ${typeof result}, value: ${result}`);
        }
        // Check for errors
        if (!data.success) {
            throw new Error(data.error || 'Unknown error occurred');
        }
        // Format output
        if (data.count === 0) {
            return "📋 **Custom Perspectives**\n\nNo custom perspectives found.";
        }
        if (format === 'simple') {
            const perspectiveNames = data.perspectives.map((p) => p.name);
            return `📋 **Custom Perspectives** (${data.count})\n\n${perspectiveNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}`;
        }
        else {
            const perspectiveDetails = data.perspectives.map((p, index) => `${index + 1}. **${p.name}**\n   🆔 ${p.identifier}`);
            return `📋 **Custom Perspectives** (${data.count})\n\n${perspectiveDetails.join('\n\n')}`;
        }
    }
    catch (error) {
        console.error('Error in listCustomPerspectives:', error);
        return `❌ **Error**: ${error instanceof Error ? error.message : String(error)}`;
    }
}
