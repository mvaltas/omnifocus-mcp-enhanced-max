import { executeAppleScript, escapeAppleScript, appleScriptFindByName } from '../../utils/scriptExecution.js';
/**
 * Generate pure AppleScript for item removal
 */
export function generateAppleScript(params) {
    const id = params.id ? escapeAppleScript(params.id) : '';
    const name = params.name ? escapeAppleScript(params.name) : '';
    const itemType = params.itemType;
    // Verify we have at least one identifier
    if (!id && !name) {
        return `return "{\\\"success\\\":false,\\\"error\\\":\\\"Either id or name must be provided\\\"}"`;
    }
    // Construct AppleScript with error handling
    let script = `
  try
    tell application "OmniFocus"
      tell front document
        -- Find the item to remove
        set foundItem to missing value
`;
    // Add ID search if provided
    if (id) {
        script += `
        -- Try to find by ID first
        try
          set foundItem to first ${itemType === 'task' ? 'flattened task' : 'flattened project'} where id = "${id}"
        end try
`;
    }
    // Add name search if provided (and no ID or as fallback)
    const selector = itemType === 'task' ? 'flattened task' : 'flattened project';
    if (!id && name) {
        script += `
        -- Find by name (whitespace-tolerant)
${appleScriptFindByName(selector, name)}
`;
    }
    else if (id && name) {
        script += `
        -- If ID search failed, try to find by name as fallback (whitespace-tolerant)
        if foundItem is missing value then
${appleScriptFindByName(selector, name)}
        end if
`;
    }
    // Add the rest of the script
    script += `
        -- If we found the item, remove it
        if foundItem is not missing value then
          set itemName to name of foundItem
          set itemId to id of foundItem as string
          
          -- Delete the item
          delete foundItem
          
          -- Return success
          return "{\\\"success\\\":true,\\\"id\\\":\\"" & itemId & "\\",\\\"name\\\":\\"" & itemName & "\\"}"
        else
          -- Item not found
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Item not found\\\"}"
        end if
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
  end try
  `;
    return script;
}
/**
 * Remove a task or project from OmniFocus
 */
export async function removeItem(params) {
    try {
        const script = generateAppleScript(params);
        const stdout = await executeAppleScript(script);
        try {
            const result = JSON.parse(stdout);
            return { success: result.success, id: result.id, name: result.name, error: result.error };
        }
        catch {
            return { success: false, error: `Failed to parse result: ${stdout}` };
        }
    }
    catch (error) {
        return { success: false, error: error?.message || "Unknown error in removeItem" };
    }
}
