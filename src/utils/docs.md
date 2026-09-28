# Noridoc: Utilities

Path: @/src/utils

### Overview
Core utilities for script execution, date formatting, and the perspective engine that enables advanced task filtering using OmniFocus 4.2+ APIs.

### How it fits into the larger codebase

This folder provides the execution layer between the MCP server and OmniFocus. Tools in @/src/tools/primitives call `executeAppleScript()` or `executeOmniFocusScript()` to run scripts that manipulate OmniFocus data, while date utilities ensure correct date format conversions between ISO 8601 and AppleScript's expected format.

Scripts in @/src/utils/omnifocusScripts are loaded and executed by the functions in this folder, with parameter injection handled by `executeOmniFocusScript()`.

### Core Implementation

**scriptExecution.ts:**
Provides three main execution modes:
- `executeAppleScript()` - Writes AppleScript to a temp file and executes via `osascript`
- `executeJXA()` - Writes JavaScript to a temp file and executes via `osascript -l JavaScript`
- `executeOmniFocusScript()` - Loads a script from @/src/utils/omnifocusScripts, injects parameters, wraps it in JXA, and executes via `app.evaluateJavascript()`

The `executeOmniFocusScript()` function handles script path resolution across different installation contexts (dist vs src), parameter injection by prepending `injectedArgs` declarations, and escape handling for embedding scripts within JXA wrappers.

**dateFormatter.ts:**
Generates locale-independent AppleScript code to construct dates from ISO date strings (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS). Returns multi-line AppleScript that creates a `tempDate` variable by programmatically setting year, month, day, and time properties using numeric values. This approach avoids AppleScript's locale-dependent date string parsing (e.g., `date "28 January 2026"` fails with error -30720 on German systems) by constructing dates through property assignment instead.

**dateFormatter.test.ts:**
Comprehensive test suite (14 tests) verifying dateFormatter behavior across multiple scenarios: basic date formatting, custom variable names, error handling (empty/invalid dates), time calculations (midnight, noon, arbitrary times), and output format validation. Tests use explicit ISO datetime strings with timezone information to ensure consistent behavior. All tests focus on behavior (does it generate correct AppleScript?) rather than implementation details (how does it parse dates internally). This test suite establishes the testing pattern for utility functions in the codebase.


### Things to Know

**Testing Utilities:**
Pure utility functions in this folder should have corresponding test files (e.g., dateFormatter.test.ts). Tests should be colocated with source files, focus on behavior rather than implementation, and use explicit test data (like ISO datetime strings) to ensure consistent behavior. The dateFormatter.test.ts suite demonstrates the testing pattern: describe blocks for grouping, explicit expectations, timezone-aware test data, and comprehensive edge case coverage.

**Temp File Execution:**
All script execution writes to temp files in `tmpdir()` rather than passing scripts via command-line arguments. This avoids shell escaping issues with quotes, backslashes, and special characters that plagued earlier implementations.

**Parameter Injection Mechanism:**
`executeOmniFocusScript()` uses string replacement to inject parameters into script files. It prepends a `const injectedArgs = {...}` block and then replaces hardcoded parameter declarations with references to `injectedArgs`. This allows scripts to be parameterized without modifying the script files themselves.

**Double-Escaping for JXA:**
When embedding OmniJS scripts in JXA wrappers, `executeOmniFocusScript()` performs escaping on backslashes, backticks, and dollar signs to prevent template literal interpretation issues in the `evaluateJavascript()` call.

**Perspective Engine Limitations:**

**Script Path Resolution:**
`executeOmniFocusScript()` checks multiple paths (dist, src, relative) to locate scripts, enabling the code to work both in development and after TypeScript compilation.

**Locale-Dependent Date Parsing Bug (Error -30720):**
AppleScript's `date "28 January 2026"` syntax is locale-dependent and fails with error -30720 on non-English systems. The original implementation in commit b6f096b used English month names assuming they would work universally. This broke on German systems where AppleScript expects German month names. The fix (commit 0bcb681) constructs dates programmatically by setting numeric properties (`year`, `month`, `day`, `time`), which is locale-independent.

**Tell Block Context Bug (Error -1723):**
The initial locale-independent fix (commit 0bcb681) had a critical flaw: date construction was happening INSIDE the `tell application "OmniFocus"` block. When AppleScript encounters `set year of tempDate to 2026` inside an application's tell block, it tries to resolve `year` as an application property rather than a system date property. This causes error -1723 (errAEPrivilegeViolation) with the German error message "„year" kann nicht gelesen werden. Zugriff nicht erlaubt."

The solution is to construct dates OUTSIDE any `tell application` block, then pass the constructed date variables into the block. The `formatDateForAppleScript()` function now accepts a variable name parameter and returns AppleScript code that must be placed BEFORE the tell block. The primitive functions (editItem, addOmniFocusTask, addProject) generate date construction code at the script's beginning, outside all tell blocks.

Created and maintained by Nori.
