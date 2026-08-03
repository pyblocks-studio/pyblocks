"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const format = require("../js/project-format.js");

const valid = () => ({
    format: format.FORMAT,
    version: format.VERSION,
    name: "Demo",
    libraries: ["random", "math", "math"],
    workspace: { blocks: { blocks: [] } },
});

test("normalizes and deterministically sorts selected libraries", () => {
    assert.deepEqual(format.validate(valid()).libraries, ["math", "random"]);
});

test("rejects malformed JSON with an understandable error", () => {
    assert.throws(() => format.parse("{"), /Project JSON is invalid/);
});

test("rejects unknown project versions", () => {
    const project = valid();
    project.version = 99;
    assert.throws(
        () => format.validate(project),
        /Unsupported PyBlocks project version/,
    );
});

test("rejects prototype-pollution properties", () => {
    assert.throws(
        () =>
            format.parse(
                '{"format":"pyblocks-project","version":1,"workspace":{},"__proto__":{}}',
            ),
        /unsafe property/,
    );
});

test("filters invalid library identifiers and removes duplicates", () => {
    const project = valid();
    project.libraries = ["math", "bad-name", '__import__("x")', "math"];
    assert.deepEqual(format.validate(project).libraries, ["math"]);
});

test("requires Blockly workspace state", () => {
    const project = valid();
    delete project.workspace;
    assert.throws(() => format.validate(project), /workspace data is missing/);
});

test("preserves valid remix attribution in project files", () => {
    const project = valid();
    project.attribution = {
        projectId: "9c175b4a-b78e-4f13-9c83-e27d4dd59a8c",
        projectName: "Original loops",
        username: "creator_1",
    };
    assert.deepEqual(
        format.parse(JSON.stringify(project)).attribution,
        project.attribution,
    );
});

test("rejects incomplete or unsafe remix attribution", () => {
    const project = valid();
    project.attribution = {
        projectId: "not-a-project-id",
        projectName: "Original",
        username: "bad user",
    };
    assert.throws(
        () => format.validate(project),
        /remix attribution is invalid/,
    );
});

test("migrates the legacy version-zero project envelope", () => {
    const project = valid();
    project.version = 0;
    delete project.settings;
    const migrated = format.parse(JSON.stringify(project));
    assert.equal(migrated.version, format.VERSION);
    assert.equal(migrated.settings.executionTimeoutMs, 10_000);
});

test("rejects project files larger than five megabytes", () => {
    assert.throws(
        () => format.parse("x".repeat(format.MAX_FILE_BYTES + 1)),
        /5 MB size limit/,
    );
});
