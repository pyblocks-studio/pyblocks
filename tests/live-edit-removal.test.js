"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

test("Live Edit is absent from active PyBlocks code", () => {
    const root = path.join(__dirname, "..");
    const activeFiles = [
        "editor.html",
        "friends.html",
        "project.html",
        "js/cloud-service.js",
        "js/cloud-controller.js",
        "js/community-platform.js",
        "js/community.js",
        "js/live-sync.js",
        "css/main.css",
        "css/community.css",
    ];
    const forbidden =
        /Live Edit|live-edit|pyblocks_live_|project_contributors|project-collaborator/i;

    assert.equal(existsSync(path.join(root, "js", "live-edit.js")), false);
    assert.equal(existsSync(path.join(root, "live-edit.js")), false);
    activeFiles.forEach((file) => {
        assert.doesNotMatch(
            readFileSync(path.join(root, file), "utf8"),
            forbidden,
        );
    });
});
