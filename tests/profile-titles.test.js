"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

test("developer is giveable while the PyBlocks official title is protected", () => {
    const migration = readFileSync(
        path.join(
            __dirname,
            "..",
            "supabase",
            "migrations",
            "20260818060345_protected_profile_titles.sql",
        ),
        "utf8",
    );
    const platform = readFileSync(
        path.join(__dirname, "..", "js", "community-platform.js"),
        "utf8",
    );
    const styles = readFileSync(
        path.join(__dirname, "..", "css", "community.css"),
        "utf8",
    );

    assert.match(platform, /DEVELOPER, ADMIN, MODERATOR/);
    assert.match(migration, /Only @PyBlocks can use that title/);
    assert.match(migration, /lower\(username\) = 'pyblocks'/);
    assert.match(styles, /\.official-account-badge/);
});
