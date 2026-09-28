# Noridoc: Tool Primitives

Path: @/src/tools/primitives

### Overview
Core implementation functions for OmniFocus operations, generating AppleScript or invoking OmniFocus scripts to create, edit, delete, and query tasks and projects.

### How it fits into the larger codebase

These primitives are called by tool definitions in @/src/tools/definitions, which provide the Zod schema validation and MCP response formatting. Each primitive function encapsulates the logic for a single OmniFocus operation, using @/src/utils/scriptExecution.ts to execute AppleScript or OmniJS scripts.

The separation between primitives and definitions enables the business logic to be independent of the MCP protocol layer. Primitives return simple success/error objects, while definitions format these into MCP-compliant responses.

### Core Implementation

**Task Operations:**
- `addOmniFocusTask.ts` - Generates AppleScript to create tasks with properties (name, note, dates, tags, parent). Handles inbox placement, project assignment, and subtask creation. Uses `formatDateForAppleScript()` for date conversion.
- `editItem.ts` - Generates AppleScript to modify task/project properties. Supports status changes, tag operations (add/remove/replace), moving tasks between projects via `newProjectName`, and property updates. Handles both task and project editing with type-specific fields.
- `removeItem.ts` - Generates AppleScript to delete tasks or projects by ID or name, with confirmation of deletion.
- `getTaskById.ts` - Retrieves detailed task information including subtask hierarchy by traversing children recursively.

**Batch Operations:**
- `batchAddItems.ts` - Creates multiple tasks or projects in a single AppleScript execution, reducing round-trip overhead.
- `batchRemoveItems.ts` - Deletes multiple items by ID in a single operation.

**Query Operations:**
- `getInboxTasks.ts` - Returns tasks in the inbox using `flattenedTasks` where `inInbox = true`
- `getNextFromInbox.ts` - Returns the oldest active task from the inbox or indicates if empty, executing @/src/utils/omnifocusScripts/getNextFromInbox.js
- `getFlaggedTasks.ts` - Returns flagged tasks with optional project filtering
- `getForecastTasks.ts` - Returns tasks with due dates or defer dates in a specified date range
- `getTodayCompletedTasks.ts` - Uses @/src/utils/omnifocusScripts/todayCompletedTasks.js to retrieve today's completed tasks
- `getTasksByTag.ts` - Queries tasks by tag name with exact or partial matching
- `filterTasks.ts` - Advanced filtering supporting multiple criteria (status, dates, projects, tags, search text)

**Perspective Operations:**
- `getCustomPerspectiveTasks.ts` - Executes @/src/utils/omnifocusScripts/getCustomPerspectiveTasks.js to retrieve tasks from custom perspectives with hierarchical structure
- `listCustomPerspectives.ts` - Executes @/src/utils/omnifocusScripts/listCustomPerspectives.js to list available custom perspectives

**Project Operations:**
- `addProject.ts` - Creates projects with properties (name, note, folder, sequential, status)

### Things to Know

**AppleScript Generation Pattern:**
Task and item editing primitives use a `generateAppleScript()` helper that builds AppleScript strings with conditional property setting. This avoids executing empty AppleScript statements and enables parameter sanitization by escaping quotes and backslashes before interpolation.

**Subtask Creation Validation:**
`addOmniFocusTask.ts` includes `validateParentTaskParams()` to prevent conflicting parameters - users cannot specify both `parentTaskId` and `parentTaskName`, nor can they specify both a parent task and a project name (since subtasks inherit their parent's project).

**Tag Operations:**
`editItem.ts` supports three tag operation modes: `addTags` (append), `removeTags` (remove specific), and `replaceTags` (clear all and set new). Tag creation happens automatically if a referenced tag doesn't exist.

**Hierarchical Task Retrieval:**
`getTaskById.ts` and `getCustomPerspectiveTasks.ts` preserve parent-child relationships. `getCustomPerspectiveTasks` returns a `taskMap` where each task contains `parent` and `children` fields, allowing reconstruction of the task tree.

**Locale-Independent Date Construction:**
All date parameters use ISO format (YYYY-MM-DD or full ISO 8601). Primitives call `formatDateForAppleScript()` from @/src/utils/dateFormatter.ts which returns multi-line AppleScript code that constructs dates by setting numeric properties (year, month, day, time) rather than parsing date strings. This prevents locale-dependent failures where English month names like "January" cause error -30720 on systems with non-English locales (e.g., German).

**CRITICAL:** Date construction code MUST be placed OUTSIDE the `tell application "OmniFocus"` block. If date property assignment happens inside a tell block, AppleScript tries to resolve properties like `year` in the application's context, causing error -1723 (errAEPrivilegeViolation). All primitives generate date construction code with unique variable names (dueDateVar, deferDateVar) at the beginning of the script, before any tell blocks. These pre-constructed date variables are then referenced inside the OmniFocus tell block when setting task/project dates.

**Error Propagation:**
AppleScript executions return JSON with `success` and `error` fields. Primitives parse these results and propagate errors upward. Temp file cleanup is wrapped in try-finally blocks to ensure cleanup even on failures.

Created and maintained by Nori.
