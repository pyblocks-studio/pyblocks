"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const service = require("../js/export-service.js");

test("export filenames remove unsafe characters and duplicate extensions", () => {
    assert.equal(
        service.safeBaseName(" bad<name>?.py", "py", "script"),
        "bad-name--",
    );
    assert.equal(service.safeBaseName("demo.py", "py", "script"), "demo");
    assert.equal(service.safeBaseName("", "pyblocks", "project"), "project");
});
