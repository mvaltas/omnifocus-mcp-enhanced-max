// List all custom perspectives using OmniJS API: Perspective.Custom.all
(() => {
  try {
    const customPerspectives = Perspective.Custom.all;

    const perspectives = customPerspectives.map(p => ({
      name: p.name,
      identifier: p.identifier
    }));

    const result = {
      success: true,
      count: perspectives.length,
      perspectives: perspectives
    };

    return JSON.stringify(result);

  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message || String(error),
      count: 0,
      perspectives: []
    };

    return JSON.stringify(errorResult);
  }
})();
