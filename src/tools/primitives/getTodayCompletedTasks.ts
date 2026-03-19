import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface GetTodayCompletedTasksOptions {
  limit?: number;
}

export async function getTodayCompletedTasks(options: GetTodayCompletedTasksOptions = {}): Promise<string> {
  try {
    const { limit = 20 } = options;
    
    const result = await executeOmniFocusScript('@todayCompletedTasks.js', { limit });
    
    if (typeof result === 'string') {
      return result;
    }
    
    // If the result is an object, format it
    if (result && typeof result === 'object') {
      const data = result as any;

      if (data.error) {
        throw new Error(data.error);
      }

      let output = `# ✅ Tasks Completed Today\\n\\n`;

      if (data.tasks && Array.isArray(data.tasks)) {
        if (data.tasks.length === 0) {
          output += "🎯 No tasks completed today yet.\\n";
        } else {
          const taskCount = data.tasks.length;
          const totalCount = data.filteredCount || taskCount;

          output += `🎉 ${totalCount} task${totalCount === 1 ? '' : 's'} completed today`;
          if (taskCount < totalCount) {
            output += ` (showing first ${taskCount})`;
          }
          output += `:\\n\\n`;
          
          // Group tasks by project
          const tasksByProject = groupTasksByProject(data.tasks);
          
          tasksByProject.forEach((tasks, projectName) => {
            if (tasksByProject.size > 1) {
              output += `## 📁 ${projectName}\\n`;
            }
            
            tasks.forEach((task: any) => {
              output += formatCompletedTask(task);
              output += '\\n';
            });
            
            if (tasksByProject.size > 1) {
              output += '\\n';
            }
          });
          
          output += `\\n---\\n📊 **Today's summary**: ${totalCount} task${totalCount === 1 ? '' : 's'} completed\\n`;
          output += `📅 **Query time**: ${new Date().toLocaleString()}\\n`;
        }
      } else {
        output += "Could not retrieve task data\\n";
      }

      return output;
    }

    return "Could not parse OmniFocus response";

  } catch (error) {
    console.error("Error in getTodayCompletedTasks:", error);
    throw new Error(`Failed to get today's completed tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Group tasks by project
function groupTasksByProject(tasks: any[]): Map<string, any[]> {
  const grouped = new Map<string, any[]>();

  tasks.forEach(task => {
    const projectName = task.projectName || (task.inInbox ? '📥 Inbox' : '📂 No Project');
    
    if (!grouped.has(projectName)) {
      grouped.set(projectName, []);
    }
    grouped.get(projectName)!.push(task);
  });
  
  return grouped;
}

// Format a single completed task
function formatCompletedTask(task: any): string {
  let output = '';
  
  // Task name and flag
  const flagSymbol = task.flagged ? '🚩 ' : '';
  
  output += `✅ ${flagSymbol}${task.name}`;
  
  // Completion time
  if (task.completedDate) {
    const completedTime = new Date(task.completedDate).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    output += ` *(completed at ${completedTime})*`;
  }
  
  // Estimate
  const additionalInfo: string[] = [];
  
  if (task.estimatedMinutes) {
    const hours = Math.floor(task.estimatedMinutes / 60);
    const minutes = task.estimatedMinutes % 60;
    if (hours > 0) {
      additionalInfo.push(`⏱ ${hours}h${minutes > 0 ? `${minutes}m` : ''}`);
    } else {
      additionalInfo.push(`⏱ ${minutes}m`);
    }
  }
  
  if (additionalInfo.length > 0) {
    output += ` (${additionalInfo.join(', ')})`;
  }
  
  output += '\\n';
  
  // Note
  if (task.note && task.note.trim()) {
    output += `  📝 ${task.note.trim()}\\n`;
  }
  
  // Tags
  if (task.tags && task.tags.length > 0) {
    const tagNames = task.tags.map((tag: any) => tag.name).join(', ');
    output += `  🏷 ${tagNames}\\n`;
  }
  
  return output;
}