(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    root.PyBlocksProjectFormat = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
    "use strict";

    const FORMAT = "pyblocks-project";
    const VERSION = 1;
    const MAX_FILE_BYTES = 5 * 1024 * 1024;
    const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
    const LIBRARY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
    const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,32}$/;

    function assertSafeTree(value, depth = 0) {
        if (depth > 100) throw new Error("Project data is nested too deeply.");
        if (!value || typeof value !== "object") return;
        for (const key of Object.keys(value)) {
            if (FORBIDDEN_KEYS.has(key))
                throw new Error("Project contains an unsafe property.");
            assertSafeTree(value[key], depth + 1);
        }
    }

    function normalizeLibraries(libraries) {
        if (!Array.isArray(libraries))
            throw new Error("Project libraries must be a list.");
        return [
            ...new Set(
                libraries.filter(
                    (name) =>
                        typeof name === "string" && LIBRARY_PATTERN.test(name),
                ),
            ),
        ].sort();
    }

    function normalizeAttribution(attribution) {
        if (!attribution) return null;
        const projectId = String(attribution.projectId || "");
        const projectName = String(attribution.projectName || "").slice(0, 120);
        const username = String(attribution.username || "");
        if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                projectId,
            ) ||
            !projectName ||
            !USERNAME_PATTERN.test(username)
        )
            throw new Error("Project remix attribution is invalid.");
        return { projectId, projectName, username };
    }

    function validate(project) {
        assertSafeTree(project);
        if (!project || project.format !== FORMAT)
            throw new Error("This is not a PyBlocks project file.");
        if (project.version !== VERSION)
            throw new Error(
                `Unsupported PyBlocks project version: ${project.version}.`,
            );
        if (!project.workspace || typeof project.workspace !== "object")
            throw new Error("Project workspace data is missing.");
        return {
            format: FORMAT,
            version: VERSION,
            name:
                typeof project.name === "string"
                    ? project.name.slice(0, 120)
                    : "Untitled",
            libraries: normalizeLibraries(project.libraries || []),
            settings: {
                executionTimeoutMs: Math.min(
                    60_000,
                    Math.max(
                        1_000,
                        Number(project.settings?.executionTimeoutMs) || 10_000,
                    ),
                ),
            },
            attribution: normalizeAttribution(project.attribution),
            workspace: project.workspace,
        };
    }

    function migrate(project) {
        assertSafeTree(project);
        if (project?.format === FORMAT && project.version === 0) {
            return {
                ...project,
                version: VERSION,
                name:
                    typeof project.name === "string"
                        ? project.name
                        : "Migrated project",
                libraries: project.libraries || [],
                settings: project.settings || { executionTimeoutMs: 10_000 },
            };
        }
        return project;
    }

    function parse(text) {
        if (typeof text !== "string")
            throw new Error("Project content must be text.");
        if (new Blob([text]).size > MAX_FILE_BYTES)
            throw new Error("Project exceeds the 5 MB size limit.");
        let data;
        try {
            data = JSON.parse(text);
        } catch (error) {
            throw new Error(`Project JSON is invalid: ${error.message}`);
        }
        return validate(migrate(data));
    }

    function create(
        workspace,
        libraries,
        name = "Untitled",
        settings = {},
        attribution = null,
    ) {
        return validate({
            format: FORMAT,
            version: VERSION,
            name,
            libraries,
            workspace,
            settings,
            attribution,
        });
    }

    return {
        FORMAT,
        VERSION,
        MAX_FILE_BYTES,
        LIBRARY_PATTERN,
        normalizeLibraries,
        normalizeAttribution,
        validate,
        migrate,
        parse,
        create,
    };
});
