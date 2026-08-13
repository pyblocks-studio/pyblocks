const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

async function setRawTestProgram(page, source) {
    await page.evaluate((code) => {
        const workspace = window.PyBlocksWorkspace;
        workspace.clear();
        const event = workspace.newBlock("py_when_run");
        event.initSvg();
        event.render();
        const raw = workspace.newBlock("py_raw_code");
        raw.data = code;
        raw.initSvg();
        raw.render();
        event.nextConnection.connect(raw.previousConnection);
        window.PythonEngine.updatePreview();
    }, source);
}

test("editor starts without page errors and essential actions remain visible", async ({
    page,
}) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/editor.html");
    await expect(
        page.getByRole("button", { name: "Run Python" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Libraries" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(
        page.getByRole("region", { name: "Block workspace" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
});

test("help, tutorial, pygame preview, and risky export warning work", async ({
    page,
}) => {
    await page.addInitScript(() =>
        localStorage.setItem("pyblocks-editor-tutorial-v1", "complete"),
    );
    await page.goto("/editor.html");
    await page.getByRole("button", { name: "Help" }).click();
    await expect(
        page.getByRole("heading", { name: "PyBlocks Python Guide" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close help" }).click();

    await page.getByRole("button", { name: "Libraries" }).click();
    await page.locator('.library-option input[value="pygame"]').check();
    await expect(
        page.getByRole("region", { name: "Pygame preview" }),
    ).toBeVisible();
    await page.locator('.library-option input[value="os"]').check();
    await page.getByRole("button", { name: "Done" }).click();
    await page
        .getByRole("button", { name: "Fullscreen Pygame preview" })
        .click();
    await expect(
        page.getByRole("button", { name: "Restore Pygame preview" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Restore Pygame preview" }).click();

    await page.getByRole("button", { name: "Open project menu" }).click();
    page.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("can access files or information");
        await dialog.dismiss();
    });
    await page.getByRole("menuitem", { name: /Export Python/ }).click();
});

test("Python import is absent and cloud projects compress losslessly", async ({
    page,
}, testInfo) => {
    test.skip(
        !testInfo.project.name.includes("chromium-desktop"),
        "Cloud frontend behavior is engine-independent.",
    );
    await page.goto("/editor.html");
    await page.getByRole("button", { name: "Open project menu" }).click();
    await expect(
        page.getByRole("menuitem", { name: "Import Python to Blocks…" }),
    ).toHaveCount(0);
    const roundTrip = await page.evaluate(async () => {
        const source = JSON.stringify({
            format: "pyblocks-project",
            name: "Compression test 🐍",
            blocks: Array.from({ length: 100 }, (_, index) => ({ index })),
        });
        const packed = await window.PyBlocksCloud.compress(source);
        return {
            matches:
                (await window.PyBlocksCloud.decompress(
                    packed.payload,
                    packed.encoding,
                )) === source,
            encoding: packed.encoding,
        };
    });
    expect(roundTrip.matches).toBe(true);
    expect(["gzip-base64", "base64"]).toContain(roundTrip.encoding);

    await page.getByRole("button", { name: "Sign in" }).click();
    const cloudDialog = page.getByRole("dialog", { name: "PyBlocks Cloud" });
    await expect(cloudDialog).toBeVisible();
    await expect(cloudDialog.getByRole("status")).toContainText(
        "Sign in or create an account.",
    );
});

test("public navigation search works without signing in", async ({
    page,
}, testInfo) => {
    test.skip(
        !testInfo.project.name.includes("chromium-desktop"),
        "Public discovery behavior is engine-independent.",
    );
    await page.route("**/rest/v1/**", (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: "[]",
        }),
    );
    await page.goto("/index.html");
    const navSearch = page
        .getByRole("search")
        .getByPlaceholder("Search projects or users…");
    await expect(navSearch).toBeVisible();
    await navSearch.fill("loops");
    await page
        .getByRole("search")
        .getByRole("button", { name: "Search" })
        .click();
    await expect(page).toHaveURL(/discover\.html\?q=loops/);
    await expect(
        page.getByRole("group", { name: "Search result type" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Projects" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Users" })).toBeVisible();
});

test("published projects have separate read-only view and remix actions", async ({
    page,
}, testInfo) => {
    test.skip(
        !testInfo.project.name.includes("chromium-desktop"),
        "Published project routing is engine-independent.",
    );
    const projectId = "9c175b4a-b78e-4f13-9c83-e27d4dd59a8c";
    const userId = "1eb758ce-9e9d-4474-8c94-eef8da1ce54b";
    const project = {
        format: "pyblocks-project",
        version: 1,
        name: "Loop demo",
        libraries: [],
        settings: { executionTimeoutMs: 10_000 },
        attribution: null,
        workspace: { blocks: { languageVersion: 0, blocks: [] } },
    };
    await page.route("**/rest/v1/**", (route) => {
        const url = route.request().url();
        const body = url.includes("pyblocks_profiles")
            ? [
                  {
                      user_id: userId,
                      username: "original_creator",
                      display_name: "Original Creator",
                      avatar_path: null,
                      role: "member",
                      active_seconds: 0,
                      joined_at: "2026-08-01T00:00:00Z",
                      updated_at: "2026-08-01T00:00:00Z",
                  },
              ]
            : [
                  {
                      id: projectId,
                      user_id: userId,
                      name: "Loop demo",
                      description: "A published loop project.",
                      payload: Buffer.from(JSON.stringify(project)).toString(
                          "base64",
                      ),
                      encoding: "base64",
                      published_at: "2026-08-01T00:00:00Z",
                      updated_at: "2026-08-01T00:00:00Z",
                      remixed_from_project_id: null,
                      remixed_from_name: null,
                      remixed_from_username: null,
                  },
              ];
        return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(body),
        });
    });

    await page.goto(`/project.html?id=${projectId}`);
    await expect(
        page.getByRole("link", { name: "VIEW PROJECT" }),
    ).toHaveAttribute("href", `editor.html?view=${projectId}`);
    await expect(
        page.getByRole("link", { name: "REMIX PROJECT" }),
    ).toHaveAttribute("href", `editor.html?remix=${projectId}`);

    await page.goto(`/editor.html?view=${projectId}`);
    await expect(page.locator("#project-name-input")).toHaveValue("Loop demo");
    await expect(page.locator("#project-name-input")).toHaveAttribute(
        "readonly",
        "",
    );
    await expect(page.locator("#save-status")).toContainText("read only");
    await expect(page.locator("#save-now-btn")).toBeHidden();
    expect(
        await page.evaluate(() => window.PyBlocksWorkspace.options.readOnly),
    ).toBe(true);
});

test("runtime executes Python semantics, input, errors, concurrency, and termination", async ({
    page,
}) => {
    await page.goto("/tests/runtime-smoke.html");
    await expect(page.locator("body")).toHaveAttribute(
        "data-complete",
        "true",
        { timeout: 15_000 },
    );
    await expect(page.locator('[data-status="fail"]')).toHaveCount(0);
    await expect(page.locator('[data-status="pass"]')).toHaveCount(9);
});

test("project menu is keyboard operable", async ({ page }) => {
    await page.goto("/editor.html");
    const menu = page.getByRole("button", { name: "Open project menu" });
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(
        page.getByRole("menuitem", { name: "New Project" }),
    ).toBeFocused();
    await page.keyboard.press("End");
    await expect(
        page.getByRole("menuitem", { name: "Clear Workspace" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
});

test("settings dialog traps focus, resets, and restores its opener", async ({
    page,
}) => {
    await page.goto("/editor.html");
    const opener = page.getByRole("button", { name: "Open settings" });
    await opener.click();
    await expect(
        page.getByRole("dialog", { name: "PyBlocks Settings" }),
    ).toBeVisible();
    await expect(page.getByLabel("Appearance")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
});

test("editor has no serious automated accessibility violations", async ({
    page,
}, testInfo) => {
    test.skip(
        !testInfo.project.name.includes("desktop"),
        "Run axe once per desktop engine.",
    );
    await page.goto("/editor.html");
    const results = await new AxeBuilder({ page })
        .disableRules(["aria-allowed-attr"])
        .analyze();
    expect(
        results.violations.filter((issue) =>
            ["serious", "critical"].includes(issue.impact),
        ),
    ).toEqual([]);
});

test("mobile layout keeps every essential action on screen", async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name.includes("desktop"),
        "Mobile/tablet projects only.",
    );
    await page.goto("/editor.html");
    for (const name of [
        "Libraries",
        "Open project menu",
        "Open settings",
        "Run Python",
        "Stop",
    ]) {
        const box = await page.getByRole("button", { name }).boundingBox();
        expect(box).not.toBeNull();
        expect(box.x + box.width).toBeLessThanOrEqual(
            page.viewportSize().width + 1,
        );
    }
});

test("autosave restores blocks and selected libraries after reload", async ({
    page,
}, testInfo) => {
    test.skip(
        !testInfo.project.name.includes("chromium-desktop"),
        "Persistence behavior is engine-independent.",
    );
    await page.goto("/editor.html");
    await page.evaluate(() => {
        localStorage.removeItem("pyblocks-autosave-v1");
        const block = window.PyBlocksWorkspace.newBlock("py_when_run");
        block.initSvg();
        block.render();
        window.PythonEngine.setLibraries(["random", "math"]);
        window.PythonEngine.saveAutosave();
    });
    await page.reload();
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    window.PyBlocksWorkspace.getBlocksByType(
                        "py_when_run",
                        false,
                    ).length,
            ),
        )
        .toBe(1);
    expect(
        await page.evaluate(() =>
            [...window.PythonEngine.selectedLibraries].sort(),
        ),
    ).toEqual(["math", "random"]);
});

test("corrupt autosave is rejected without preventing startup", async ({
    page,
}, testInfo) => {
    test.skip(
        !testInfo.project.name.includes("chromium-desktop"),
        "Persistence behavior is engine-independent.",
    );
    await page.goto("/editor.html");
    await page.evaluate(() =>
        localStorage.setItem("pyblocks-autosave-v1", '{"bad":true}'),
    );
    await page.reload();
    await expect(
        page.getByRole("button", { name: "Run Python" }),
    ).toBeEnabled();
    expect(
        await page.evaluate(() => localStorage.getItem("pyblocks-autosave-v1")),
    ).toBeNull();
});

test("system theme and accessibility preferences apply live and survive reload", async ({
    page,
}, testInfo) => {
    test.skip(
        !testInfo.project.name.includes("chromium-desktop"),
        "Preference behavior is engine-independent.",
    );
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/editor.html");
    await page.getByRole("button", { name: "Open settings" }).click();
    await page.getByLabel("Appearance").selectOption("system");
    await page.getByRole("switch", { name: "High contrast" }).click();
    await page.getByRole("switch", { name: "Larger text" }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
    await expect(page.locator("html")).toHaveAttribute(
        "data-font-size",
        "large",
    );
    await expect(page.locator("html")).toHaveAttribute(
        "data-motion",
        "reduced",
    );
    await page.getByRole("button", { name: "Open settings" }).click();
    await page.getByRole("button", { name: "Reset settings" }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).toHaveAttribute(
        "data-contrast",
        "normal",
    );
});

test("editor presents Python errors with a generated source line", async ({
    page,
}, testInfo) => {
    test.skip(
        !testInfo.project.name.includes("chromium-desktop"),
        "Runtime presentation is engine-independent.",
    );
    await page.goto("/editor.html");
    await setRawTestProgram(page, "value = 1 / 0\nprint(value)");
    await page.getByRole("button", { name: "Run Python" }).click();
    await expect(page.getByRole("log")).toContainText("ZeroDivisionError");
    await expect(page.getByRole("log")).toContainText("1 | value = 1 / 0");
    await expect(
        page.getByRole("button", { name: "Run Python" }),
    ).toBeEnabled();
});

test("Stop terminates an infinite program and resets run state", async ({
    page,
}, testInfo) => {
    test.skip(
        !testInfo.project.name.includes("chromium-desktop"),
        "Runtime presentation is engine-independent.",
    );
    await page.goto("/editor.html");
    await setRawTestProgram(page, "while True:\n    pass");
    await page.getByRole("button", { name: "Run Python" }).click();
    await expect(page.getByRole("button", { name: "Stop" })).toBeEnabled();
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByRole("log")).toContainText("Execution stopped");
    await expect(
        page.getByRole("button", { name: "Run Python" }),
    ).toBeEnabled();
});

test("visual project save and open round-trip workspace and libraries", async ({
    page,
}, testInfo) => {
    test.skip(
        !testInfo.project.name.includes("chromium-desktop"),
        "Project download behavior is engine-independent.",
    );
    await page.goto("/editor.html");
    await page.evaluate(() => {
        const event = window.PyBlocksWorkspace.newBlock("py_when_run");
        event.initSvg();
        event.render();
        window.PythonEngine.setLibraries(["math"]);
    });
    await page.getByRole("button", { name: "Open project menu" }).click();
    page.once("dialog", (dialog) => dialog.accept("round-trip.pyblocks"));
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Save Project…" }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const projectBuffer = Buffer.concat(chunks);
    await page.evaluate(() => window.PythonEngine.newProject());
    expect(
        await page.evaluate(
            () =>
                window.PyBlocksWorkspace.getBlocksByType("py_when_run", false)
                    .length,
        ),
    ).toBe(0);
    await page.locator("#project-file-input").setInputFiles({
        name: "round-trip.pyblocks",
        mimeType: "application/json",
        buffer: projectBuffer,
    });
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    window.PyBlocksWorkspace.getBlocksByType(
                        "py_when_run",
                        false,
                    ).length,
            ),
        )
        .toBe(1);
    expect(
        await page.evaluate(() => [...window.PythonEngine.selectedLibraries]),
    ).toEqual(["math"]);
});

for (const path of ["/index.html", "/license.html"]) {
    test(`${path} has no serious accessibility violations`, async ({
        page,
    }, testInfo) => {
        test.skip(
            !testInfo.project.name.includes("chromium-desktop"),
            "Marketing-page axe checks run once.",
        );
        await page.goto(path);
        const results = await new AxeBuilder({ page }).analyze();
        expect(
            results.violations.filter((issue) =>
                ["serious", "critical"].includes(issue.impact),
            ),
        ).toEqual([]);
        await page.getByRole("button", { name: "Open settings" }).click();
        await expect(
            page.getByRole("dialog", { name: "PyBlocks Settings" }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(
            page.getByRole("button", { name: "Open settings" }),
        ).toBeFocused();
    });
}
