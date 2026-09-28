// OmniJS script to get tasks by tag from OmniFocus
(() => {
  try {
    // Parameters will be injected by the script execution system
    const tagName = injectedArgs ? injectedArgs.tagName : null; // Must be provided by caller
    const hideCompleted = injectedArgs ? injectedArgs.hideCompleted : true; // Default to true
    const exactMatch = injectedArgs ? injectedArgs.exactMatch : false;
    
    if (!tagName) {
      return JSON.stringify({
        success: false,
        error: "Tag name is required"
      });
    }
    
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
    
    const exportData = {
      exportDate: new Date().toISOString(),
      searchTag: tagName,
      exactMatch: exactMatch,
      matchedTags: [],
      tasks: [],
      availableTags: []
    };
    
    // Get all active tags for reference
    const allTags = flattenedTags.filter(tag => tag.active);
    exportData.availableTags = allTags.map(tag => getTagPath(tag)).sort();
    
    console.log(`Searching for tags matching "${tagName}" (exact: ${exactMatch})`);
    
    // Find matching tags — check both leaf name and full path to support nested tags
    const searchLower = tagName.toLowerCase();
    let matchingTags = [];
    if (exactMatch) {
      matchingTags = allTags.filter(tag => {
        const path = getTagPath(tag);
        return tag.name.toLowerCase() === searchLower || path.toLowerCase() === searchLower;
      });
    } else {
      matchingTags = allTags.filter(tag => {
        const path = getTagPath(tag);
        return tag.name.toLowerCase().includes(searchLower) || path.toLowerCase().includes(searchLower);
      });
    }

    exportData.matchedTags = matchingTags.map(tag => getTagPath(tag));
    console.log(`Found ${matchingTags.length} matching tags: ${exportData.matchedTags.join(', ')} (searched by full path)`);
    
    if (matchingTags.length === 0) {
      console.log("No matching tags found");
      return JSON.stringify(exportData);
    }
    
    // Get all tasks that have any of the matching tags
    let matchingTasks = [];
    
    matchingTags.forEach(tag => {
      const tasksWithTag = tag.tasks;
      console.log(`Tag "${tag.name}" has ${tasksWithTag.length} tasks`);
      
      tasksWithTag.forEach(task => {
        // Avoid duplicates (a task might have multiple matching tags)
        if (!matchingTasks.find(t => t.id.primaryKey === task.id.primaryKey)) {
          matchingTasks.push(task);
        }
      });
    });
    
    console.log(`Found ${matchingTasks.length} unique tasks with matching tags`);
    
    // Filter by completion status if needed
    if (hideCompleted) {
      matchingTasks = matchingTasks.filter(task => 
        task.taskStatus !== Task.Status.Completed && 
        task.taskStatus !== Task.Status.Dropped
      );
    }
    
    console.log(`Processing ${matchingTasks.length} tasks after filtering completed`);
    
    // Process each matching task
    matchingTasks.forEach(task => {
      try {
        const taskData = {
          id: task.id.primaryKey,
          name: task.name,
          note: task.note || "",
          taskStatus: getTaskStatus(task.taskStatus),
          flagged: task.flagged,
          dueDate: formatDate(task.dueDate),
          deferDate: formatDate(task.deferDate),
          plannedDate: formatDate(task.plannedDate),
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
        console.log(`Error processing task with tag: ${taskError}`);
      }
    });
    
    console.log(`Successfully processed ${exportData.tasks.length} tasks with matching tags`);
    return JSON.stringify(exportData);
    
  } catch (error) {
    console.error(`Error in tasksByTag script: ${error}`);
    return JSON.stringify({
      success: false,
      error: `Error getting tasks by tag: ${error}`
    });
  }
})();