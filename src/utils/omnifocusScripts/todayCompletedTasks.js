// Script to get tasks completed today
(() => {
  try {
    // Get injected parameters
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};
    const limit = args.limit || 20;

    // Get all tasks
    const allTasks = flattenedTasks;

    // Filter to completed tasks
    const completedTasks = allTasks.filter(task =>
      task.taskStatus === Task.Status.Completed
    );

    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Filter to tasks completed today
    const todayCompletedTasks = completedTasks.filter(task => {
      if (!task.completionDate) return false;

      const completedDate = new Date(task.completionDate);
      return completedDate >= today && completedDate < tomorrow;
    });

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

    // Task status map
    const statusMap = {
      [Task.Status.Available]: "Available",
      [Task.Status.Blocked]: "Blocked",
      [Task.Status.Completed]: "Completed",
      [Task.Status.Dropped]: "Dropped",
      [Task.Status.DueSoon]: "DueSoon",
      [Task.Status.Next]: "Next",
      [Task.Status.Overdue]: "Overdue"
    };

    // Build export data
    const exportData = {
      exportDate: new Date().toISOString(),
      tasks: [],
      totalCount: completedTasks.length,
      filteredCount: todayCompletedTasks.length,
      query: "tasks completed today"
    };

    // Process each task completed today
    const tasksToProcess = todayCompletedTasks.slice(0, limit);

    tasksToProcess.forEach(task => {
      try {
        const taskData = {
          id: task.id.primaryKey,
          name: task.name,
          note: task.note || "",
          taskStatus: statusMap[task.taskStatus] || "Unknown",
          flagged: task.flagged,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          deferDate: task.deferDate ? task.deferDate.toISOString() : null,
          completedDate: task.completionDate ? task.completionDate.toISOString() : null,
          estimatedMinutes: task.estimatedMinutes,
          projectId: task.containingProject ? task.containingProject.id.primaryKey : null,
          projectName: task.containingProject ? task.containingProject.name : null,
          inInbox: task.inInbox,
          tags: task.tags.map(tag => ({
            id: tag.id.primaryKey,
            name: getTagPath(tag)
          }))
        };

        exportData.tasks.push(taskData);
      } catch (taskError) {
        // Skip tasks that fail to process
      }
    });

    return JSON.stringify(exportData);

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `Error querying today's completed tasks: ${error}`
    });
  }
})();
