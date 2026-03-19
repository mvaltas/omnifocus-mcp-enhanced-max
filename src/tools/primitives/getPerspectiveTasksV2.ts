import { PerspectiveEngine, TaskItem } from '../../utils/perspectiveEngine.js';

// Perspective access interface based on the OmniFocus 4.2+ API

export interface GetPerspectiveTasksV2Params {
  perspectiveName: string;
  hideCompleted?: boolean;
  limit?: number;
}

export interface GetPerspectiveTasksV2Result {
  success: boolean;
  tasks?: TaskItem[];
  perspectiveInfo?: {
    name: string;
    rulesCount: number;
    aggregation: string;
  };
  error?: string;
}

/**
 * Get perspective-filtered tasks — V2
 * Uses the OmniFocus 4.2+ archivedFilterRules API
 *
 * Advantages:
 * - 100% accuracy: retrieves tasks as actually filtered by the perspective
 * - Zero configuration: uses the user's existing perspective settings
 * - Full support: all 27 filter rule types and 3 aggregation modes
 */
export async function getPerspectiveTasksV2(
  params: GetPerspectiveTasksV2Params
): Promise<GetPerspectiveTasksV2Result> {
  
  console.log(`[PerspectiveV2] Fetching tasks for perspective "${params.perspectiveName}"`);
  console.log(`[PerspectiveV2] Params:`, {
    hideCompleted: params.hideCompleted,
    limit: params.limit
  });

  try {
    const engine = new PerspectiveEngine();

    const result = await engine.getFilteredTasks(params.perspectiveName, {
      hideCompleted: params.hideCompleted,
      limit: params.limit
    });

    if (!result.success) {
      console.error(`[PerspectiveV2] Failed:`, result.error);
      return {
        success: false,
        error: result.error
      };
    }

    console.log(`[PerspectiveV2] Success`);
    console.log(`[PerspectiveV2] Perspective info:`, result.perspectiveInfo);
    console.log(`[PerspectiveV2] Filtered ${result.tasks?.length || 0} tasks`);

    if (result.tasks && result.tasks.length > 0) {
      console.log(`[PerspectiveV2] First task sample:`, {
        first: {
          name: result.tasks[0].name,
          flagged: result.tasks[0].flagged,
          dueDate: result.tasks[0].dueDate,
          projectName: result.tasks[0].projectName,
          tags: result.tasks[0].tags?.length || 0
        }
      });
    }

    return {
      success: true,
      tasks: result.tasks,
      perspectiveInfo: result.perspectiveInfo
    };

  } catch (error: any) {
    console.error(`[PerspectiveV2] Perspective engine exception:`, error);

    return {
      success: false,
      error: `Perspective engine exception: ${error.message || 'Unknown error'}`
    };
  }
}