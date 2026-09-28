import { executeAppleScript, escapeAppleScript, appleScriptFindByName } from '../../utils/scriptExecution.js';
import { formatDateForAppleScript } from '../../utils/dateFormatter.js';
/**
 * Generate pure AppleScript for item editing
 */
export function generateAppleScript(params) {
    const id = params.id ? escapeAppleScript(params.id) : '';
    const name = params.name ? escapeAppleScript(params.name) : '';
    const itemType = params.itemType;
    // Verify we have at least one identifier
    if (!id && !name) {
        return `return "{\\\"success\\\":false,\\\"error\\\":\\\"Either id or name must be provided\\\"}"`;
    }
    // Prepare date construction code OUTSIDE the tell block to avoid error -1723
    let dateSetupScript = '';
    const useDueDate = params.newDueDate !== undefined && params.newDueDate !== "";
    const useDeferDate = params.newDeferDate !== undefined && params.newDeferDate !== "";
    const usePlannedDate = params.newPlannedDate !== undefined && params.newPlannedDate !== "";
    if (useDueDate) {
        dateSetupScript += formatDateForAppleScript(params.newDueDate, 'dueDateVar') + '\n';
    }
    if (useDeferDate) {
        dateSetupScript += formatDateForAppleScript(params.newDeferDate, 'deferDateVar') + '\n';
    }
    if (usePlannedDate) {
        dateSetupScript += formatDateForAppleScript(params.newPlannedDate, 'plannedDateVar') + '\n';
    }
    // Construct AppleScript with error handling
    let script = `
  try
    ${dateSetupScript}
    tell application "OmniFocus"
      tell front document
        -- Find the item to edit
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
    // Both branches use whitespace-tolerant lookup. For tasks, we look in
    // non-inbox tasks first (matching the previous behaviour of preferring
    // project tasks over inbox tasks), then fall back to the full pool.
    if (!id && name) {
        if (itemType === 'task') {
            script += `
        -- Find by name (whitespace-tolerant; prefer project tasks over inbox)
${appleScriptFindByName('flattened task', name, 'in inbox is false')}
        if foundItem is missing value then
${appleScriptFindByName('flattened task', name)}
        end if
`;
        }
        else {
            script += `
        -- Find by name (whitespace-tolerant)
${appleScriptFindByName('flattened project', name)}
`;
        }
    }
    else if (id && name) {
        if (itemType === 'task') {
            script += `
        -- If ID search failed, fall back to whitespace-tolerant name lookup
        if foundItem is missing value then
${appleScriptFindByName('flattened task', name, 'in inbox is false')}
          if foundItem is missing value then
${appleScriptFindByName('flattened task', name)}
          end if
        end if
`;
        }
        else {
            script += `
        -- If ID search failed, fall back to whitespace-tolerant name lookup
        if foundItem is missing value then
${appleScriptFindByName('flattened project', name)}
        end if
`;
        }
    }
    // Add the item editing logic
    script += `
        -- If we found the item, edit it
        if foundItem is not missing value then
          set itemName to name of foundItem
          set itemId to id of foundItem as string
          set changedProperties to {}
`;
    // Common property updates for both tasks and projects
    if (params.newName !== undefined) {
        script += `
          -- Update name
          set name of foundItem to "${escapeAppleScript(params.newName)}"
          set end of changedProperties to "name"
`;
    }
    if (params.newNote !== undefined) {
        script += `
          -- Update note
          set note of foundItem to "${escapeAppleScript(params.newNote)}"
          set end of changedProperties to "note"
`;
    }
    if (params.newDueDate !== undefined) {
        if (params.newDueDate === "") {
            script += `
          -- Clear due date
          set due date of foundItem to missing value
          set end of changedProperties to "due date"
`;
        }
        else {
            script += `
          -- Update due date (date constructed outside tell block)
          set due date of foundItem to dueDateVar
          set end of changedProperties to "due date"
`;
        }
    }
    if (params.newDeferDate !== undefined) {
        if (params.newDeferDate === "") {
            script += `
          -- Clear defer date
          set defer date of foundItem to missing value
          set end of changedProperties to "defer date"
`;
        }
        else {
            script += `
          -- Update defer date (date constructed outside tell block)
          set defer date of foundItem to deferDateVar
          set end of changedProperties to "defer date"
`;
        }
    }
    if (params.newPlannedDate !== undefined) {
        if (params.newPlannedDate === "") {
            script += `
          -- Clear planned date
          set planned date of foundItem to missing value
          set end of changedProperties to "planned date"
`;
        }
        else {
            script += `
          -- Update planned date (date constructed outside tell block)
          set planned date of foundItem to plannedDateVar
          set end of changedProperties to "planned date"
`;
        }
    }
    if (params.newFlagged !== undefined) {
        script += `
          -- Update flagged status
          set flagged of foundItem to ${params.newFlagged}
          set end of changedProperties to "flagged"
`;
    }
    if (params.newEstimatedMinutes !== undefined) {
        script += `
          -- Update estimated minutes
          set estimated minutes of foundItem to ${params.newEstimatedMinutes}
          set end of changedProperties to "estimated minutes"
`;
    }
    // Task-specific updates
    if (itemType === 'task') {
        // Update task status
        if (params.newStatus !== undefined) {
            if (params.newStatus === 'completed') {
                script += `
          -- Mark task as completed (mark complete works for both inbox and project tasks)
          mark complete foundItem
          set end of changedProperties to "status (completed)"
`;
            }
            else if (params.newStatus === 'dropped') {
                script += `
          -- Mark task as dropped
          set dropped of foundItem to true
          set end of changedProperties to "status (dropped)"
`;
            }
            else if (params.newStatus === 'incomplete') {
                script += `
          -- Mark task as incomplete (mark incomplete works for both inbox and project tasks)
          mark incomplete foundItem
          set end of changedProperties to "status (incomplete)"
`;
            }
        }
        // Move task to a different project
        if (params.newProjectName !== undefined) {
            const projectName = escapeAppleScript(params.newProjectName);
            script += `
          -- Move to new project
          set destProject to missing value
          try
            set destProject to first flattened project where name = "${projectName}"
          end try

          if destProject is not missing value then
            move foundItem to end of tasks of destProject
            set end of changedProperties to "project"
          else
            -- Project not found error
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Project not found: ${projectName}\\\"}"
          end if
`;
        }
        // Move within containing project (top/bottom). Useful for the MIT
        // convention where the day's most-important task lives at the top of its
        // project's task list. Operates on the task's `containing project`, which
        // for a subtask is the top-level project — moving a subtask this way will
        // also promote it out of its parent task.
        if (params.newPositionInProject !== undefined) {
            const placement = params.newPositionInProject === 'top' ? 'beginning' : 'end';
            script += `
          -- Move task to ${params.newPositionInProject} of its containing project
          try
            set itemProject to containing project of foundItem
            if itemProject is not missing value then
              move foundItem to ${placement} of tasks of itemProject
              set end of changedProperties to "position (${params.newPositionInProject} of project)"
            end if
          end try
`;
        }
        // Handle tag operations
        if (params.replaceTags && params.replaceTags.length > 0) {
            const tagsList = params.replaceTags.map(tag => `"${escapeAppleScript(tag)}"`).join(", ");
            script += `
          -- Replace all tags
          set tagNames to {${tagsList}}
          set existingTags to tags of foundItem
          
          -- First clear all existing tags
          repeat with existingTag in existingTags
            remove existingTag from tags of foundItem
          end repeat
          
          -- Then add new tags
          repeat with tagName in tagNames
            set tagNameStr to tagName as text
            set tagObj to missing value
            try
              set tagObj to first flattened tag where name = tagNameStr
            end try
            if tagObj is missing value then
              set tagObj to make new tag with properties {name:tagNameStr}
            end if
            add tagObj to tags of foundItem
          end repeat
          set end of changedProperties to "tags (replaced)"
`;
        }
        else {
            // Add tags if specified
            if (params.addTags && params.addTags.length > 0) {
                const tagsList = params.addTags.map(tag => `"${escapeAppleScript(tag)}"`).join(", ");
                script += `
          -- Add tags
          set tagNames to {${tagsList}}
          repeat with tagName in tagNames
            set tagNameStr to tagName as text
            set tagObj to missing value
            try
              set tagObj to first flattened tag where name = tagNameStr
            end try
            if tagObj is missing value then
              set tagObj to make new tag with properties {name:tagNameStr}
            end if
            add tagObj to tags of foundItem
          end repeat
          set end of changedProperties to "tags (added)"
`;
            }
            // Remove tags if specified
            if (params.removeTags && params.removeTags.length > 0) {
                const tagsList = params.removeTags.map(tag => `"${escapeAppleScript(tag)}"`).join(", ");
                script += `
          -- Remove tags
          set tagNames to {${tagsList}}
          repeat with tagName in tagNames
            set tagNameStr to tagName as text
            try
              set tagObj to first flattened tag where name = tagNameStr
              remove tagObj from tags of foundItem
            end try
          end repeat
          set end of changedProperties to "tags (removed)"
`;
            }
        }
    }
    // Project-specific updates
    if (itemType === 'project') {
        // Update sequential status
        if (params.newSequential !== undefined) {
            script += `
          -- Update sequential status
          set sequential of foundItem to ${params.newSequential}
          set end of changedProperties to "sequential"
`;
        }
        // Update project status
        if (params.newProjectStatus !== undefined) {
            const statusValue = params.newProjectStatus === 'active' ? 'active status' :
                params.newProjectStatus === 'completed' ? 'done status' :
                    params.newProjectStatus === 'dropped' ? 'dropped status' :
                        'on hold status';
            script += `
          -- Update project status
          set status of foundItem to ${statusValue}
          set end of changedProperties to "status"
`;
        }
        // Move to a new folder
        if (params.newFolderName !== undefined) {
            const folderName = escapeAppleScript(params.newFolderName);
            script += `
          -- Move to new folder
          set destFolder to missing value
          try
            set destFolder to first flattened folder where name = "${folderName}"
          end try
          
          if destFolder is missing value then
            -- Create the folder if it doesn't exist
            set destFolder to make new folder with properties {name:"${folderName}"}
          end if
          
          -- Move project to the folder
          move foundItem to destFolder
          set end of changedProperties to "folder"
`;
        }
    }
    script += `
          -- Prepare the changed properties as a string
          set changedPropsText to ""
          repeat with i from 1 to count of changedProperties
            set changedPropsText to changedPropsText & item i of changedProperties
            if i < count of changedProperties then
              set changedPropsText to changedPropsText & ", "
            end if
          end repeat
          
          -- Return success with details
          return "{\\\"success\\\":true,\\\"id\\\":\\"" & itemId & "\\",\\\"name\\\":\\"" & itemName & "\\",\\\"changedProperties\\\":\\"" & changedPropsText & "\\"}"
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
 * Edit a task or project in OmniFocus
 */
export async function editItem(params) {
    try {
        const script = generateAppleScript(params);
        const stdout = await executeAppleScript(script);
        try {
            const result = JSON.parse(stdout);
            return { success: result.success, id: result.id, name: result.name, changedProperties: result.changedProperties, error: result.error };
        }
        catch {
            return { success: false, error: `Failed to parse result: ${stdout}` };
        }
    }
    catch (error) {
        return { success: false, error: error?.message || "Unknown error in editItem" };
    }
}
