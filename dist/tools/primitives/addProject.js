import { executeAppleScript, escapeAppleScript } from '../../utils/scriptExecution.js';
import { formatDateForAppleScript } from '../../utils/dateFormatter.js';
/**
 * Generate pure AppleScript for project creation
 */
export function generateAppleScript(params) {
    const name = escapeAppleScript(params.name);
    const note = params.note ? escapeAppleScript(params.note) : '';
    const flagged = params.flagged === true;
    const estimatedMinutes = params.estimatedMinutes?.toString() || '';
    const tags = params.tags || [];
    const folderName = params.folderName ? escapeAppleScript(params.folderName) : '';
    const sequential = params.sequential === true;
    // Prepare date construction code OUTSIDE the tell block to avoid error -1723
    let dateSetupScript = '';
    const useDueDate = !!params.dueDate;
    const useDeferDate = !!params.deferDate;
    if (useDueDate) {
        dateSetupScript += formatDateForAppleScript(params.dueDate, 'dueDateVar') + '\n';
    }
    if (useDeferDate) {
        dateSetupScript += formatDateForAppleScript(params.deferDate, 'deferDateVar') + '\n';
    }
    // Construct AppleScript with error handling
    let script = `
  try
    ${dateSetupScript}
    tell application "OmniFocus"
      tell front document
        -- Determine the container (root or folder)
        if "${folderName}" is "" then
          -- Create project at the root level
          set newProject to make new project with properties {name:"${name}"}
        else
          -- Use specified folder
          try
            set theFolder to first flattened folder where name = "${folderName}"
            set newProject to make new project with properties {name:"${name}"} at end of projects of theFolder
          on error
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Folder not found: ${folderName}\\\"}"
          end try
        end if
        
        -- Set project properties
        ${note ? `set note of newProject to "${note}"` : ''}
        ${useDueDate ? `set due date of newProject to dueDateVar` : ''}
        ${useDeferDate ? `set defer date of newProject to deferDateVar` : ''}
        ${flagged ? `set flagged of newProject to true` : ''}
        ${estimatedMinutes ? `set estimated minutes of newProject to ${estimatedMinutes}` : ''}
        ${`set sequential of newProject to ${sequential}`}
        
        -- Get the project ID
        set projectId to id of newProject as string
        
        -- Add tags if provided
        ${tags.length > 0 ? tags.map(tag => {
        const sanitizedTag = escapeAppleScript(tag);
        return `
          try
            set theTag to first flattened tag where name = "${sanitizedTag}"
            add theTag to tags of newProject
          on error
            -- Ignore errors finding/adding tags
          end try`;
    }).join('\n') : ''}
        
        -- Return success with project ID
        return "{\\\"success\\\":true,\\\"projectId\\\":\\"" & projectId & "\\",\\\"name\\\":\\"${name}\\"}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
  end try
  `;
    return script;
}
/**
 * Add a project to OmniFocus
 */
export async function addProject(params) {
    try {
        const script = generateAppleScript(params);
        const stdout = await executeAppleScript(script);
        try {
            const result = JSON.parse(stdout);
            return { success: result.success, projectId: result.projectId, error: result.error };
        }
        catch {
            return { success: false, error: `Failed to parse result: ${stdout}` };
        }
    }
    catch (error) {
        return { success: false, error: error?.message || "Unknown error in addProject" };
    }
}
