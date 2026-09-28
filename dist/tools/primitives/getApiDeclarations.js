import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
/** Default cap. The full API is ~177 KB, far more than is useful in one reply. */
export const DEFAULT_MAX_CHARS = 12000;
/**
 * Strip the boilerplate preamble OmniFocus prepends to every response (the
 * "save this file as OmniFocus.d.ts" instructions and tsconfig sample). It is
 * ~400 characters of noise on every call and would otherwise eat the
 * character budget. The leading version line is kept, since knowing which
 * build answered is worth one line.
 */
export function stripPreamble(declarations) {
    const lines = declarations.split('\n');
    const version = lines.length > 0 && lines[0].startsWith('//') ? lines[0].replace(/^\/\/\s*/, '') : '';
    // The preamble is the contiguous run of comment and blank lines at the top.
    // The body starts at the first real declaration, plus the section comment
    // sitting directly above it (e.g. "// Task") if there is one.
    let firstDecl = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('declare ')) {
            firstDecl = i;
            break;
        }
    }
    if (firstDecl === -1) {
        return { version, body: '' };
    }
    // Step back over any blank lines, then pick up the section comment
    // (e.g. "// Task") that labels this declaration, if there is one.
    let bodyStart = firstDecl;
    let probe = firstDecl - 1;
    while (probe >= 0 && lines[probe].trim() === '') {
        probe -= 1;
    }
    if (probe >= 0 && lines[probe].startsWith('// ') && !lines[probe].includes('OmniFocus.d.ts')) {
        bodyStart = probe;
    }
    return { version, body: lines.slice(bodyStart).join('\n').trim() };
}
/**
 * Build the human-readable report. Exported so it can be tested without
 * talking to OmniFocus.
 */
export function formatDeclarations(data, maxChars) {
    const scope = data.filter ? `matching "${data.filter}"` : 'for the entire API';
    const { version, body } = stripPreamble(data.declarations || '');
    const header = `**OmniFocus Omni Automation API** ${scope}` + (version ? `\n${version}` : '');
    // A filter that matches nothing still returns the preamble, so an empty body
    // -- not an empty response -- is what "no match" actually looks like.
    if (body === '') {
        return `${header}\n\nNo API or documentation matched. Try a broader term, such as a bare class name ("Task", "Project", "Tag").`;
    }
    if (body.length <= maxChars) {
        return `${header}\n\n\`\`\`typescript\n${body}\n\`\`\``;
    }
    return `${header}\n\n` +
        `Showing the first ${maxChars} of ${body.length} characters. ` +
        `Narrow the filter (or raise maxChars) to see the rest.\n\n` +
        `\`\`\`typescript\n${body.slice(0, maxChars)}\n\`\`\``;
}
/**
 * Look up the Omni Automation API as TypeScript declarations, straight from
 * the running copy of OmniFocus. This is authoritative for the installed
 * version, unlike anything remembered or documented elsewhere.
 *
 * Requires OmniFocus 4.9 or later.
 */
export async function getApiDeclarations(options = {}) {
    const { filter, maxChars = DEFAULT_MAX_CHARS } = options;
    try {
        const result = await executeOmniFocusScript('@getApiDeclarations.js', {
            filter: filter ?? null
        });
        const data = typeof result === 'string' ? JSON.parse(result) : result;
        if (!data || !data.success) {
            throw new Error((data && data.error) || 'Unknown error occurred');
        }
        return formatDeclarations(data, maxChars);
    }
    catch (error) {
        return `**Error**: ${error instanceof Error ? error.message : String(error)}`;
    }
}
