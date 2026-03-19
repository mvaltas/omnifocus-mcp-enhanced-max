import { executeAppleScript, escapeAppleScript } from '../../utils/scriptExecution.js';
import { formatDateForAppleScript } from '../../utils/dateFormatter.js';
/**
 * Generate pure AppleScript for task creation
 */
export function generateAppleScript(params) {
    const name = escapeAppleScript(params.name);
    const note = params.note ? escapeAppleScript(params.note) : '';
    const flagged = params.flagged === true;
    const estimatedMinutes = params.estimatedMinutes?.toString() || '';
    const tags = params.tags || [];
    const projectName = params.projectName ? escapeAppleScript(params.projectName) : '';
    const parentTaskId = params.parentTaskId ? escapeAppleScript(params.parentTaskId) : '';
    const parentTaskName = params.parentTaskName ? escapeAppleScript(params.parentTaskName) : '';
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
        -- Determine the container (parent task, project, or inbox)
        if "${parentTaskId}" is not "" then
          -- Create subtask using parent task ID
          try
            set theParentTask to first flattened task where id = "${parentTaskId}"
            set newTask to make new task with properties {name:"${name}"} at end of tasks of theParentTask
          on error
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Parent task not found with ID: ${parentTaskId}\\\"}"
          end try
        else if "${parentTaskName}" is not "" then
          -- Create subtask using parent task name
          try
            set theParentTask to first flattened task where name = "${parentTaskName}"
            set newTask to make new task with properties {name:"${name}"} at end of tasks of theParentTask
          on error
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Parent task not found with name: ${parentTaskName}\\\"}"
          end try
        else if "${projectName}" is not "" then
          -- Use specified project
          try
            set theProject to first flattened project where name = "${projectName}"
            set newTask to make new task with properties {name:"${name}"} at end of tasks of theProject
          on error
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Project not found: ${projectName}\\\"}"
          end try
        else
          -- Use inbox of the document
          set newTask to make new inbox task with properties {name:"${name}"}
        end if
        
        -- Set task properties
        ${note ? `set note of newTask to "${note}"` : ''}
        ${useDueDate ? `set due date of newTask to dueDateVar` : ''}
        ${useDeferDate ? `set defer date of newTask to deferDateVar` : ''}
        ${flagged ? `set flagged of newTask to true` : ''}
        ${estimatedMinutes ? `set estimated minutes of newTask to ${estimatedMinutes}` : ''}
        
        -- Get the task ID
        set taskId to id of newTask as string
        
        -- Add tags if provided
        ${tags.length > 0 ? tags.map(tag => {
        const sanitizedTag = escapeAppleScript(tag);
        return `
          try
            set theTag to first flattened tag where name = "${sanitizedTag}"
            add theTag to tags of newTask
          on error
            -- Ignore errors finding/adding tags
          end try`;
    }).join('\n') : ''}
        
        -- Return success with task ID
        return "{\\\"success\\\":true,\\\"taskId\\\":\\"" & taskId & "\\",\\\"name\\\":\\"${name}\\"}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
  end try
  `;
    return script;
}
/**
 * Validate parent task parameters to prevent conflicts
 */
export function validateParentTaskParams(params) {
    if (params.parentTaskId && params.parentTaskName) {
        return { valid: false, error: "Cannot specify both parentTaskId and parentTaskName. Please use only one." };
    }
    if ((params.parentTaskId || params.parentTaskName) && params.projectName) {
        return { valid: false, error: "Cannot specify both parent task and project. Subtasks inherit project from their parent." };
    }
    return { valid: true };
}
/**
 * Add a task to OmniFocus
 */
export async function addOmniFocusTask(params) {
    try {
        const validation = validateParentTaskParams(params);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        const script = generateAppleScript(params);
        const stdout = await executeAppleScript(script);
        try {
            const result = JSON.parse(stdout);
            return { success: result.success, taskId: result.taskId, error: result.error };
        }
        catch {
            return { success: false, error: `Failed to parse result: ${stdout}` };
        }
    }
    catch (error) {
        return { success: false, error: error?.message || "Unknown error in addOmniFocusTask" };
    }
}
