// Look up Omni Automation API as TypeScript declarations (OmniFocus 4.9+).
(() => {
  let filter = null;

  try {
    filter = injectedArgs && injectedArgs.filter ? injectedArgs.filter : null;

    if (typeof app.getTypeScriptDeclarations !== "function") {
      throw new Error(
        "getTypeScriptDeclarations is unavailable. It requires OmniFocus 4.9 or later; this copy reports " +
        app.userVersion.versionString + "."
      );
    }

    // Passing null returns the entire API (~177 KB). The caller is responsible
    // for truncating; we report the untruncated length so it can say so.
    const declarations = app.getTypeScriptDeclarations(filter);

    return JSON.stringify({
      success: true,
      filter: filter,
      omniFocusVersion: app.userVersion.versionString,
      totalLength: declarations.length,
      declarations: declarations
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message || String(error),
      filter: filter,
      totalLength: 0,
      declarations: ""
    });
  }
})();
