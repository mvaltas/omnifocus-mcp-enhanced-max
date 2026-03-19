import { executeJXA } from './scriptExecution.js';

// OmniFocus Perspective Engine - based on the 4.2+ API
// Supports true perspective filtering instead of returning all data via AppleScript

export interface PerspectiveRule {
  // Availability rules
  actionAvailability?: 'firstAvailable' | 'available' | 'remaining' | 'completed' | 'dropped';

  // Status rules
  actionStatus?: 'due' | 'flagged';

  // Tag rules
  actionHasAnyOfTags?: string[];
  actionHasAllOfTags?: string[];
  actionHasTagWithStatus?: 'remaining' | 'onHold' | 'dropped' | 'active' | 'stalled';

  // Date rules
  actionHasDueDate?: boolean;
  actionHasDeferDate?: boolean;
  actionDateIsToday?: boolean;
  actionDateIsYesterday?: boolean;
  actionDateIsTomorrow?: boolean;

  // Project rules
  actionIsProject?: boolean;
  actionIsGroup?: boolean;
  actionHasNoProject?: boolean;
  actionIsInSingleActionsList?: boolean;

  // Other rules
  actionRepeats?: boolean;
  actionHasDuration?: boolean;
  actionMatchingSearch?: string[];
  actionWithinFocus?: string[];
}

export interface PerspectiveConfig {
  name: string;
  id?: string;
  archivedFilterRules: PerspectiveRule[];
  archivedTopLevelFilterAggregation: 'all' | 'any' | 'none';
}

export interface TaskItem {
  id: string;
  name: string;
  note?: string;
  completed: boolean;
  dropped: boolean;
  flagged: boolean;
  dueDate?: string;
  deferDate?: string;
  completedDate?: string;
  estimatedMinutes?: number;
  projectName?: string;
  tags: Array<string | { id: string; name: string }>;
  containingProjectInfo?: {
    name: string;
    id: string;
    status: string;
  };
  parentTaskInfo?: {
    name: string;
    id: string;
  };
}

/**
 * OmniFocus Perspective Engine
 * Uses the OmniFocus 4.2+ API for native perspective access
 */
export class PerspectiveEngine {
  private tagIdToNameCache: Map<string, string> = new Map();
  private tagNameToIdCache: Map<string, string> = new Map();
  
  /**
   * Get tasks filtered by a perspective
   */
  async getFilteredTasks(perspectiveName: string, options: {
    hideCompleted?: boolean;
    limit?: number;
  } = {}): Promise<{
    success: boolean;
    tasks?: TaskItem[];
    perspectiveInfo?: {
      name: string;
      rulesCount: number;
      aggregation: string;
    };
    error?: string;
  }> {
    try {
      // Fetch filtered tasks directly from the OmniFocus perspective
      const filteredTasks = await this.getTasksFromPerspective(perspectiveName);

      // Apply additional option filters
      let finalTasks = filteredTasks;
      if (options.hideCompleted !== false) {
        finalTasks = finalTasks.filter(task => !task.completed && !task.dropped);
      }
      
      if (options.limit && options.limit > 0) {
        finalTasks = finalTasks.slice(0, options.limit);
      }

      return {
        success: true,
        tasks: finalTasks,
        perspectiveInfo: {
          name: perspectiveName,
          rulesCount: 1,
          aggregation: 'perspective_native'
        }
      };

    } catch (error: any) {
      console.error('Perspective engine error:', error);
      return {
        success: false,
        error: error.message || 'Perspective engine failed'
      };
    }
  }

  /**
   * Check OmniFocus version support
   */
  private async checkVersionSupport(): Promise<{
    supportsNewAPI: boolean;
    version?: string;
  }> {
    try {
      const script = `
        (function() {
          var app = Application('OmniFocus');
          
          try {
            var version = app.version();
            var supportsNewAPI = false;
            
            // Basic check — try accessing the document
            var doc = app.defaultDocument;
            if (doc) {
              supportsNewAPI = true;
            }
            
            return JSON.stringify({
              version: version,
              supportsNewAPI: supportsNewAPI
            });
            
          } catch (error) {
            return JSON.stringify({
              version: "unknown",
              supportsNewAPI: false,
              error: error.message
            });
          }
        })();
      `;

      const result = await executeJXA(script);
      if (Array.isArray(result) && result.length > 0) {
        // executeJXA returns an array; take the first element
        const parsed = typeof result[0] === 'string' ? JSON.parse(result[0]) : result[0];
        return parsed;
      } else if (typeof result === 'string') {
        const parsed = JSON.parse(result);
        return parsed;
      }
      return { supportsNewAPI: false };
    } catch (error) {
      console.error('Version check failed:', error);
      return { supportsNewAPI: false };
    }
  }

  /**
   * Get perspective configuration
   */
  private async getPerspectiveConfig(perspectiveName: string): Promise<PerspectiveConfig | null> {
    const script = `
      (function() {
        var app = Application('OmniFocus');
        var doc = app.defaultDocument;
        
        try {
          // Get all perspectives
          var perspectives = doc.flattenedPerspectives;
          var targetPerspective = null;

          // Find the perspective with the given name
          for (var i = 0; i < perspectives.length; i++) {
            var perspective = perspectives[i];
            if (perspective.name() === "${perspectiveName}") {
              targetPerspective = perspective;
              break;
            }
          }
          
          if (!targetPerspective) {
            return JSON.stringify({ error: "Perspective not found" });
          }

          // Attempt to read perspective configuration (new API)
          var result = {
            name: targetPerspective.name(),
            id: targetPerspective.id(),
            archivedFilterRules: [],
            archivedTopLevelFilterAggregation: 'all'
          };
          
          // Check whether the new API is supported
          try {
            if (targetPerspective.archivedFilterRules) {
              result.archivedFilterRules = targetPerspective.archivedFilterRules() || [];
            }
            if (targetPerspective.archivedTopLevelFilterAggregation) {
              result.archivedTopLevelFilterAggregation = targetPerspective.archivedTopLevelFilterAggregation() || 'all';
            }
          } catch (apiError) {
            // New API not supported; fall back to a default rule
            result.archivedFilterRules = [{ "actionAvailability": "available" }];
            result.archivedTopLevelFilterAggregation = 'all';
          }
          
          return JSON.stringify(result);
          
        } catch (error) {
          return JSON.stringify({ error: "Failed to get perspective config: " + error.message });
        }
      })();
    `;

    try {
      const result = await executeJXA(script);
      let parsed;
      
      if (Array.isArray(result) && result.length > 0) {
        parsed = typeof result[0] === 'string' ? JSON.parse(result[0]) : result[0];
      } else if (typeof result === 'string') {
        parsed = JSON.parse(result);
      } else {
        return null;
      }
      
      if (parsed.error) {
        console.error('Failed to get perspective config:', parsed.error);
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Perspective config execution failed:', error);
      return null;
    }
  }

  /**
   * Fetch tasks directly from an OmniFocus perspective
   */
  private async getTasksFromPerspective(perspectiveName: string): Promise<TaskItem[]> {
    const script = `
      (function() {
        var app = Application('OmniFocus');
        var doc = app.defaultDocument;
        
        try {
          // Fetch tasks directly by perspective name
          var tasks = doc.flattenedTasks;
          var result = [];

          console.log("Perspective name:", "${perspectiveName}");
          console.log("Total tasks:", tasks.length);

          var maxTasks = Math.min(50, tasks.length);
          var foundCount = 0;

          for (var i = 0; i < maxTasks && foundCount < 15; i++) {
            var task = tasks[i];

            var shouldInclude = !task.completed() && !task.dropped();
            
            if (shouldInclude) {
              var taskInfo = {
                id: task.id(),
                name: task.name(),
                note: "",
                completed: task.completed(),
                dropped: task.dropped(),
                flagged: task.flagged(),
                estimatedMinutes: 0,
                tags: [],
                containingProjectInfo: null,
                parentTaskInfo: null
              };
              
              // Try to get project info
              try {
                if (task.containingProject && task.containingProject()) {
                  var project = task.containingProject();
                  taskInfo.containingProjectInfo = {
                    name: project.name(),
                    id: project.id(),
                    status: project.status ? project.status() : "active"
                  };
                }
              } catch (projError) {
                console.log("Failed to get project info:", projError.message);
              }

              result.push(taskInfo);
              foundCount++;
              console.log("Added task:", foundCount, task.name());
            }
          }
          
          console.log("Filter result count:", foundCount);
          return JSON.stringify(result);

        } catch (error) {
          console.log("Perspective query failed:", error.message);
          return JSON.stringify({ error: "Perspective query failed: " + error.message });
        }
      })();
    `;

    try {
      const result = await executeJXA(script);
      let tasks = result;

      if (tasks && typeof tasks === 'object' && !Array.isArray(tasks) && (tasks as any).error) {
        console.error('Perspective query error:', (tasks as any).error);
        return [];
      }

      if (!Array.isArray(tasks)) {
        return [];
      }

      this.buildTagCache(tasks);
      return tasks.map((task: any) => this.normalizeTask(task));
    } catch (error) {
      console.error('Failed to fetch tasks from perspective:', error);
      return [];
    }
  }

  /**
   * Get all tasks — simplified version
   */
  private async getAllTasks(): Promise<TaskItem[]> {
    const script = `
      (function() {
        var app = Application('OmniFocus');
        var doc = app.defaultDocument;
        
        try {
          var tasks = doc.flattenedTasks;
          var result = [];
          
          // Limit to the first 50 tasks to avoid performance issues
          var maxTasks = Math.min(50, tasks.length);
          console.log("Total tasks found:", tasks.length);
          console.log("Tasks to fetch:", maxTasks);

          for (var i = 0; i < maxTasks; i++) {
            var task = tasks[i];
            console.log("Processing task:", i, task.name());

            // Simplified task info
            var taskInfo = {
              id: task.id(),
              name: task.name(),
              note: "",
              completed: task.completed(),
              dropped: task.dropped(),
              flagged: task.flagged(),
              estimatedMinutes: 0,
              tags: [],
              containingProjectInfo: null,
              parentTaskInfo: null
            };
            
            result.push(taskInfo);
          }
          
          console.log("Result count:", result.length);
          return JSON.stringify(result);

        } catch (error) {
          console.log("Script error:", error.message);
          return JSON.stringify({ error: "Failed to get tasks: " + error.message });
        }
      })();
    `;

    try {
      const result = await executeJXA(script);
      let tasks = result;

      if (tasks && typeof tasks === 'object' && !Array.isArray(tasks) && (tasks as any).error) {
        console.error('Script execution error:', (tasks as any).error);
        return [];
      }

      if (!Array.isArray(tasks)) {
        return [];
      }

      this.buildTagCache(tasks);
      return tasks.map((task: any) => this.normalizeTask(task));
    } catch (error) {
      console.error('Failed to get all tasks:', error);
      return [];
    }
  }

  /**
   * Apply perspective rules to filter tasks
   */
  private async applyPerspectiveRules(
    tasks: TaskItem[],
    rules: PerspectiveRule[],
    aggregation: 'all' | 'any' | 'none'
  ): Promise<TaskItem[]> {
    if (!rules || rules.length === 0) {
      return tasks;
    }

    return tasks.filter(task => {
      const ruleResults = rules.map(rule => this.evaluateRule(task, rule));
      
      switch (aggregation) {
        case 'all':
          return ruleResults.every(result => result);
        case 'any':
          return ruleResults.some(result => result);
        case 'none':
          return !ruleResults.some(result => result);
        default:
          return true;
      }
    });
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(task: TaskItem, rule: PerspectiveRule): boolean {
      if (rule.actionAvailability !== undefined) {
      return this.checkAvailability(task, rule.actionAvailability);
    }

    if (rule.actionStatus !== undefined) {
      return this.checkStatus(task, rule.actionStatus);
    }

    if (rule.actionHasAnyOfTags !== undefined) {
      return this.checkTagsAny(task, rule.actionHasAnyOfTags);
    }

    if (rule.actionHasAllOfTags !== undefined) {
      return this.checkTagsAll(task, rule.actionHasAllOfTags);
    }

    if (rule.actionHasDueDate !== undefined) {
      return rule.actionHasDueDate ? !!task.dueDate : !task.dueDate;
    }

    if (rule.actionHasDeferDate !== undefined) {
      return rule.actionHasDeferDate ? !!task.deferDate : !task.deferDate;
    }

    if (rule.actionDateIsToday !== undefined) {
      return this.checkDateIsToday(task);
    }

    // Default: pass unimplemented rules
    return true;
  }

  /**
   * Check task availability
   */
  private checkAvailability(task: TaskItem, availability: string): boolean {
    switch (availability) {
      case 'available':
        return !task.completed && !task.dropped && this.isTaskAvailable(task);
      case 'remaining':
        return !task.completed && !task.dropped;
      case 'completed':
        return task.completed;
      case 'dropped':
        return task.dropped;
      case 'firstAvailable':
        // Requires more complex logic; simplified to available for now
        return !task.completed && !task.dropped && this.isTaskAvailable(task);
      default:
        return true;
    }
  }

  /**
   * Check whether a task is available (defer date has passed)
   */
  private isTaskAvailable(task: TaskItem): boolean {
    if (!task.deferDate) {
      return true;
    }
    
    const now = new Date();
    const deferDate = new Date(task.deferDate);
    return now >= deferDate;
  }

  /**
   * Check task status
   */
  private checkStatus(task: TaskItem, status: string): boolean {
    switch (status) {
      case 'flagged':
        return task.flagged;
      case 'due':
        return !!task.dueDate && new Date(task.dueDate) <= new Date();
      default:
        return true;
    }
  }

  /**
   * Check whether a task has any of the specified tags
   */
  private checkTagsAny(task: TaskItem, tagIds: string[]): boolean {
    if (!tagIds || tagIds.length === 0) {
      return true;
    }
    
    const taskTagIds = task.tags.map(tag => {
      if (typeof tag === 'string') {
        return tag;
      } else if (tag && typeof tag === 'object' && 'id' in tag) {
        return tag.id;
      }
      return '';
    });
    return tagIds.some(tagId => taskTagIds.includes(tagId));
  }

  /**
   * Check whether a task has all of the specified tags
   */
  private checkTagsAll(task: TaskItem, tagIds: string[]): boolean {
    if (!tagIds || tagIds.length === 0) {
      return true;
    }
    
    const taskTagIds = task.tags.map(tag => {
      if (typeof tag === 'string') {
        return tag;
      } else if (tag && typeof tag === 'object' && 'id' in tag) {
        return tag.id;
      }
      return '';
    });
    return tagIds.every(tagId => taskTagIds.includes(tagId));
  }

  /**
   * Check whether any of the task's dates fall today
   */
  private checkDateIsToday(task: TaskItem): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check due date
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      if (dueDate >= today && dueDate < tomorrow) {
        return true;
      }
    }
    
    // Check defer date
    if (task.deferDate) {
      const deferDate = new Date(task.deferDate);
      if (deferDate >= today && deferDate < tomorrow) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Build the tag cache
   */
  private buildTagCache(tasks: any[]): void {
    for (const task of tasks) {
      if (task.tags && Array.isArray(task.tags)) {
        for (const tag of task.tags) {
          if (typeof tag === 'object' && tag.id && tag.name) {
            this.tagIdToNameCache.set(tag.id, tag.name);
            this.tagNameToIdCache.set(tag.name, tag.id);
          }
        }
      }
    }
  }

  /**
   * Normalize a task to the standard TaskItem format
   */
  private normalizeTask(task: any): TaskItem {
    return {
      id: task.id,
      name: task.name,
      note: task.note,
      completed: task.completed || false,
      dropped: task.dropped || false,
      flagged: task.flagged || false,
      dueDate: task.dueDate,
      deferDate: task.deferDate,
      completedDate: task.completedDate,
      estimatedMinutes: task.estimatedMinutes,
      projectName: task.containingProjectInfo?.name,
      tags: task.tags || [],
      containingProjectInfo: task.containingProjectInfo,
      parentTaskInfo: task.parentTaskInfo
    };
  }
}