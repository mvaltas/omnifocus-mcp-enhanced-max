import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
export async function getCustomPerspectiveTasks(options) {
    const { perspectiveName, hideCompleted = true, limit = 1000, showHierarchy = false } = options;
    if (!perspectiveName) {
        return "❌ **Error**: Perspective name cannot be empty";
    }
    try {
        const result = await executeOmniFocusScript('@getCustomPerspectiveTasks.js', {
            perspectiveName: perspectiveName
        });
        let data;
        if (typeof result === 'string') {
            try {
                data = JSON.parse(result);
            }
            catch (parseError) {
                throw new Error(`Failed to parse result: ${result}`);
            }
        }
        else if (typeof result === 'object' && result !== null) {
            data = result;
        }
        else {
            throw new Error(`Script returned invalid result type: ${typeof result}, value: ${result}`);
        }
        if (!data.success) {
            throw new Error(data.error || 'Unknown error occurred');
        }
        const taskMap = data.taskMap || {};
        const allTasks = Object.values(taskMap);
        let filteredTasks = allTasks;
        if (hideCompleted) {
            filteredTasks = allTasks.filter((task) => !task.completed);
        }
        if (filteredTasks.length === 0) {
            return `**Perspective Tasks: ${perspectiveName}**\n\nNo ${hideCompleted ? 'incomplete ' : ''}tasks found.`;
        }
        if (showHierarchy) {
            return formatHierarchicalTasks(perspectiveName, taskMap, hideCompleted);
        }
        else {
            return formatFlatTasks(perspectiveName, filteredTasks, limit, data.count);
        }
    }
    catch (error) {
        console.error('Error in getCustomPerspectiveTasks:', error);
        return `❌ **Error**: ${error instanceof Error ? error.message : String(error)}`;
    }
}
// Format tasks in a hierarchical tree view
function formatHierarchicalTasks(perspectiveName, taskMap, hideCompleted) {
    const header = `**Perspective Tasks: ${perspectiveName}** (hierarchy view)\n\n`;
    const rootTasks = Object.values(taskMap).filter((task) => task.parent === null);
    const filteredRootTasks = hideCompleted
        ? rootTasks.filter((task) => !task.completed)
        : rootTasks;
    if (filteredRootTasks.length === 0) {
        return header + `No ${hideCompleted ? 'incomplete ' : ''}root tasks found.`;
    }
    const taskTreeLines = [];
    filteredRootTasks.forEach((rootTask, index) => {
        const isLast = index === filteredRootTasks.length - 1;
        renderTaskTree(rootTask, taskMap, hideCompleted, '', isLast, taskTreeLines);
    });
    return header + taskTreeLines.join('\n');
}
// Recursively render the task tree
function renderTaskTree(task, taskMap, hideCompleted, prefix, isLast, lines) {
    const currentPrefix = prefix + (isLast ? '└─ ' : '├─ ');
    let taskLine = currentPrefix + formatTaskName(task);
    lines.push(taskLine);
    const detailPrefix = prefix + (isLast ? '   ' : '│  ');
    const taskDetails = formatTaskDetails(task);
    if (taskDetails.length > 0) {
        taskDetails.forEach(detail => {
            lines.push(detailPrefix + detail);
        });
    }
    if (task.children && task.children.length > 0) {
        const childTasks = task.children
            .map((childId) => taskMap[childId])
            .filter((child) => child && (!hideCompleted || !child.completed));
        childTasks.forEach((childTask, index) => {
            const isLastChild = index === childTasks.length - 1;
            const childPrefix = prefix + (isLast ? '   ' : '│  ');
            renderTaskTree(childTask, taskMap, hideCompleted, childPrefix, isLastChild, lines);
        });
    }
}
// Format the task name with status markers
function formatTaskName(task) {
    let name = `**${task.name}**`;
    if (task.completed) {
        name = `~~${name}~~ [Done]`;
    }
    else if (task.flagged) {
        name = `[Flagged] ${name}`;
    }
    return name;
}
// Format task detail lines
function formatTaskDetails(task) {
    const details = [];
    if (task.project) {
        details.push(`Project: ${task.project}`);
    }
    if (task.tags && task.tags.length > 0) {
        details.push(`Tags: ${task.tags.join(', ')}`);
    }
    if (task.dueDate) {
        const dueDate = new Date(task.dueDate).toLocaleDateString();
        details.push(`Due: ${dueDate}`);
    }
    if (task.estimatedMinutes) {
        const hours = Math.floor(task.estimatedMinutes / 60);
        const minutes = task.estimatedMinutes % 60;
        if (hours > 0) {
            details.push(`Estimate: ${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`);
        }
        else {
            details.push(`Estimate: ${minutes}m`);
        }
    }
    if (task.note && task.note.trim()) {
        const notePreview = task.note.trim().substring(0, 60);
        details.push(`Note: ${notePreview}${task.note.length > 60 ? '...' : ''}`);
    }
    return details;
}
// Format tasks in a flat list
function formatFlatTasks(perspectiveName, tasks, limit, totalCount) {
    let displayTasks = tasks;
    if (limit && limit > 0) {
        displayTasks = tasks.slice(0, limit);
    }
    const taskList = displayTasks.map((task, index) => {
        let taskText = `${index + 1}. **${task.name}**`;
        if (task.project) {
            taskText += `\n   Project: ${task.project}`;
        }
        if (task.tags && task.tags.length > 0) {
            taskText += `\n   Tags: ${task.tags.join(', ')}`;
        }
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate).toLocaleDateString();
            taskText += `\n   Due: ${dueDate}`;
        }
        if (task.flagged) {
            taskText += `\n   [Flagged]`;
        }
        if (task.estimatedMinutes) {
            const hours = Math.floor(task.estimatedMinutes / 60);
            const minutes = task.estimatedMinutes % 60;
            if (hours > 0) {
                taskText += `\n   Estimate: ${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
            }
            else {
                taskText += `\n   Estimate: ${minutes}m`;
            }
        }
        if (task.note && task.note.trim()) {
            const notePreview = task.note.trim().substring(0, 100);
            taskText += `\n   Note: ${notePreview}${task.note.length > 100 ? '...' : ''}`;
        }
        return taskText;
    }).join('\n\n');
    const header = `**Perspective Tasks: ${perspectiveName}** (${displayTasks.length} task${displayTasks.length === 1 ? '' : 's'})\n\n`;
    const footer = totalCount > displayTasks.length ? `\n\nShowing ${displayTasks.length} of ${totalCount} tasks` : '';
    return header + taskList + footer;
}
