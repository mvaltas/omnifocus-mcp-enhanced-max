// OmniJS script to get the oldest (next) item from OmniFocus inbox
(() => {
  try {
    // Helper function to format dates consistently
    function formatDate(date) {
      if (!date) return null;
      return date.toISOString();
    }

    // Build the full hierarchical path for a tag (e.g. "Work : Projects : Current")
    function getTagPath(tag) {
      const parts = [];
      let current = tag;
      while (current) {
        parts.unshift(current.name);
        current = current.parent;
      }
      return parts.join(' : ');
    }

    // Get task status enum mapping
    const taskStatusMap = {
      [Task.Status.Available]: "Available",
      [Task.Status.Blocked]: "Blocked",
      [Task.Status.Completed]: "Completed",
      [Task.Status.Dropped]: "Dropped",
      [Task.Status.DueSoon]: "DueSoon",
      [Task.Status.Next]: "Next",
      [Task.Status.Overdue]: "Overdue"
    };

    function getTaskStatus(status) {
      return taskStatusMap[status] || "Unknown";
    }

    // Access inbox directly (more efficient than filtering flattenedTasks)
    const inboxTasks = inbox.tasks;
    console.log(`Found ${inboxTasks.length} tasks in inbox`);

    // Filter out completed/dropped tasks and tasks without an added date
    const activeTasks = inboxTasks.filter(task => {
      // Exclude completed and dropped
      if (task.taskStatus === Task.Status.Completed || task.taskStatus === Task.Status.Dropped) {
        return false;
      }
      // Exclude unsaved tasks (null added date)
      if (!task.added) {
        return false;
      }
      return true;
    });

    console.log(`Found ${activeTasks.length} active tasks with added dates`);

    // If no tasks found, return null
    if (activeTasks.length === 0) {
      return JSON.stringify({
        success: true,
        task: null
      });
    }

    // Sort by added date ascending (oldest first)
    activeTasks.sort((a, b) => {
      return a.added - b.added;
    });

    // Get the oldest task (first in sorted array)
    const oldestTask = activeTasks[0];

    // Build task data object
    const taskData = {
      id: oldestTask.id.primaryKey,
      name: oldestTask.name,
      note: oldestTask.note || "",
      taskStatus: getTaskStatus(oldestTask.taskStatus),
      flagged: oldestTask.flagged,
      dueDate: formatDate(oldestTask.dueDate),
      deferDate: formatDate(oldestTask.deferDate),
      plannedDate: formatDate(oldestTask.plannedDate),
      added: formatDate(oldestTask.added),
      modified: formatDate(oldestTask.modified),
      estimatedMinutes: oldestTask.estimatedMinutes,
      tags: oldestTask.tags.map(tag => ({
        id: tag.id.primaryKey,
        name: getTagPath(tag)
      })),
      inInbox: true
    };

    console.log(`Returning oldest task: ${taskData.name} (added: ${taskData.added})`);

    return JSON.stringify({
      success: true,
      task: taskData
    });

  } catch (error) {
    console.error(`Error in getNextFromInbox script: ${error}`);
    return JSON.stringify({
      success: false,
      error: `Error getting next inbox item: ${error.message || error}`
    });
  }
})();
