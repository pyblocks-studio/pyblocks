(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.PyBlocksProjectFormat = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, () => {
    'use strict';

    const FORMAT = 'pyblocks-project';
    const VERSION = 1;
    const MAX_FILE_BYTES = 5 * 1024 * 1024;
    const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
    const LIBRARY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

    function assertSafeTree(value, depth = 0) {
        if (depth > 100) throw new Error('Project data is nested too deeply.');
        if (!value || typeof value !== 'object') return;
        for (const key of Object.keys(value)) {
            if (FORBIDDEN_KEYS.has(key)) throw new Error('Project contains an unsafe property.');
            assertSafeTree(value[key], depth + 1);
        }
    }

    function normalizeLibraries(libraries) {
        if (!Array.isArray(libraries)) throw new Error('Project libraries must be a list.');
        return [...new Set(libraries.filter(name => typeof name === 'string' && LIBRARY_PATTERN.test(name)))].sort();
    }

    function validate(project) {
        assertSafeTree(project);
        if (!project || project.format !== FORMAT) throw new Error('This is not a PyBlocks project file.');
        if (project.version !== VERSION) throw new Error(`Unsupported PyBlocks project version: ${project.version}.`);
        if (!project.workspace || typeof project.workspace !== 'object') throw new Error('Project workspace data is missing.');
        return {
            format: FORMAT,
            version: VERSION,
            name: typeof project.name === 'string' ? project.name.slice(0, 120) : 'Untitled',
            libraries: normalizeLibraries(project.libraries || []),
            workspace: project.workspace
        };
    }

    function parse(text) {
        if (typeof text !== 'string') throw new Error('Project content must be text.');
        if (new Blob([text]).size > MAX_FILE_BYTES) throw new Error('Project exceeds the 5 MB size limit.');
        let data;
        try { data = JSON.parse(text); }
        catch (error) { throw new Error(`Project JSON is invalid: ${error.message}`); }
        return validate(data);
    }

    function create(workspace, libraries, name = 'Untitled') {
        return validate({format: FORMAT, version: VERSION, name, libraries, workspace});
    }

    return {FORMAT, VERSION, MAX_FILE_BYTES, LIBRARY_PATTERN, normalizeLibraries, validate, parse, create};
});
