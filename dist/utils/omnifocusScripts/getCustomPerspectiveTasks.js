// Get tasks from a custom perspective by name (supports hierarchy)
(() => {
  try {
    // Get injected parameters
    const perspectiveName = injectedArgs && injectedArgs.perspectiveName ? injectedArgs.perspectiveName : null;

    if (!perspectiveName) {
      throw new Error("Perspective name is required");
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

    // Look up the custom perspective by name
    let perspective = Perspective.Custom.byName(perspectiveName);
    if (!perspective) {
      throw new Error(`No custom perspective found with name "${perspectiveName}"`);
    }

    // Switch to the perspective
    document.windows[0].perspective = perspective;

    // Map of all tasks keyed by ID (supports hierarchy)
    let taskMap = {};

    // Walk the content tree and collect task data
    let rootNode = document.windows[0].content.rootNode;

    function collectTasks(node, parentId) {
      if (node.object && node.object instanceof Task) {
        let t = node.object;
        let id = t.id.primaryKey;

        taskMap[id] = {
          id: id,
          name: t.name,
          note: t.note || "",
          project: t.project ? t.project.name : null,
          tags: t.tags ? t.tags.map(tag => getTagPath(tag)) : [],
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          deferDate: t.deferDate ? t.deferDate.toISOString() : null,
          completed: t.completed,
          flagged: t.flagged,
          estimatedMinutes: t.estimatedMinutes || null,
          repetitionRule: t.repetitionRule ? t.repetitionRule.toString() : null,
          creationDate: t.added ? t.added.toISOString() : null,
          completionDate: t.completedDate ? t.completedDate.toISOString() : null,
          parent: parentId,   // Parent task ID
          children: [],       // Child task IDs (populated below)
        };

        // Recursively collect child tasks
        node.children.forEach(childNode => {
          if (childNode.object && childNode.object instanceof Task) {
            let childId = childNode.object.id.primaryKey;
            taskMap[id].children.push(childId);
            collectTasks(childNode, id);
          } else {
            collectTasks(childNode, id);
          }
        });
      } else {
        // Non-task node — recurse into children
        node.children.forEach(childNode => collectTasks(childNode, parentId));
      }
    }

    // Start collection from root (root tasks have parent = null)
    if (rootNode && rootNode.children) {
      rootNode.children.forEach(node => collectTasks(node, null));
    }

    const taskCount = Object.keys(taskMap).length;

    const result = {
      success: true,
      perspectiveName: perspectiveName,
      perspectiveId: perspective.identifier,
      count: taskCount,
      taskMap: taskMap
    };

    return JSON.stringify(result);

  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message || String(error),
      perspectiveName: perspectiveName || null,
      perspectiveId: null,
      count: 0,
      taskMap: {}
    };

    return JSON.stringify(errorResult);
  }
})();
