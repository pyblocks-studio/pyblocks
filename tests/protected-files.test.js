"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const expected = {
    "update.bat":
        "e28dc1d26d9c189ef9a0edac8c5e9643cf6260c7eaaeaa613827078f0db77f82",
    "update/FILES_TO_UPDATE.txt":
        "7f539807fafc8c4008d833f1191c31ba8cfc586e3d736846ac30ba540b494879",
};

test("owner-managed update files remain byte-for-byte unchanged", () => {
    for (const [file, digest] of Object.entries(expected)) {
        const content = readFileSync(path.join(__dirname, "..", file));
        assert.equal(
            createHash("sha256").update(content).digest("hex"),
            digest,
        );
    }
});
