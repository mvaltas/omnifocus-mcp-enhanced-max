# Noridoc: OmniFocus Scripts

Path: @/src/utils/omnifocusScripts

### Overview
JavaScript for Automation (JXA) and OmniJS scripts that execute directly within OmniFocus to access its API and manipulate task data. These scripts use the OmniFocus OmniJS API to query perspectives, retrieve tasks, and access the task database.

### How it fits into the larger codebase

These scripts are executed by @/src/utils/scriptExecution.ts via `osascript -l JavaScript` or through OmniFocus's native `evaluateJavascript` API. They form the bridge between the MCP server and the OmniFocus application, providing direct access to OmniFocus's internal data model. The scripts are loaded as files and either executed standalone or injected with runtime parameters.

Tools in @/src/tools/primitives invoke these scripts via `executeOmniFocusScript()` or `executeJXA()`, passing parameters that get injected into the script context. Results are returned as JSON and parsed back in the TypeScript layer.

### Core Implementation

**Entry Points:**
- `listCustomPerspectives.js` - Lists all custom perspectives using `Perspective.Custom.all`
- `getCustomPerspectiveTasks.js` - Switches to a custom perspective and traverses the content tree to collect tasks with hierarchical relationships
- `omnifocusDump.js` - Full database export of all tasks, projects, folders, and tags
- `filterTasks.js` - Filter tasks based on various criteria
- `getNextFromInbox.js` - Returns the oldest active task from the inbox (tasks without Completed/Dropped status and with an added date), or null if inbox is empty. Sorts by `added` date ascending to find the first/oldest item.
- `todayCompletedTasks.js` - Retrieve completed tasks within time ranges
- `forecastTasks.js` - Retrieve tasks from the forecast view (due/deferred)
- `flaggedTasks.js`, `inboxTasks.js`, `tasksByTag.js` - Query specific task collections

**Data Flow:**
All scripts follow an IIFE pattern `(() => { ... })()` that returns JSON-stringified results. Scripts access the OmniFocus document via the global `document` object or `Application('OmniFocus')` in JXA.

**Parameter Injection:**
Scripts that need dynamic parameters (like `getCustomPerspectiveTasks.js`) reference an `injectedArgs` object that gets prepended to the script content by `executeOmniFocusScript()` in @/src/utils/scriptExecution.ts.

**Perspective Access:**
Custom perspective scripts use `Perspective.Custom.byName()` and then set `document.windows[0].perspective = perspective` to switch context before querying `document.windows[0].content.rootNode` to traverse the visible task tree.

### Things to Know

**Hierarchical Task Collection:**
`getCustomPerspectiveTasks.js` uses a recursive `collectTasks()` function that traverses the perspective's content tree, building a `taskMap` where each task includes a `parent` field and `children` array, preserving the task hierarchy as displayed in the perspective.

**Script Variants:**

**Error Handling:**
All scripts wrap execution in try-catch blocks and return JSON objects with `success` and `error` fields for consistent error propagation back to TypeScript.

**OmniJS vs JXA:**
Scripts use OmniJS (the native OmniFocus JavaScript environment) which provides direct access to perspective APIs and the task model. JXA is used as the execution wrapper via `Application('OmniFocus').evaluateJavascript()`.

Created and maintained by Nori.
