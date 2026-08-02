"use strict";

(() => {
    const storageKey = "pyblocks-preferences";
    const systemTheme = matchMedia("(prefers-color-scheme: light)");
    const systemMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const defaults = {
        theme: "dark",
        motion: systemMotion.matches ? "reduced" : "full",
        contrast: "normal",
        fontSize: "normal",
        grid: true,
        audio: true,
    };
    let preferences;
    try {
        preferences = {
            ...defaults,
            ...JSON.parse(localStorage.getItem(storageKey) || "{}"),
        };
    } catch {
        preferences = { ...defaults };
    }

    const resolvedTheme = () =>
        preferences.theme === "system"
            ? systemTheme.matches
                ? "light"
                : "dark"
            : preferences.theme;
    const root = document.documentElement;

    function apply({ persist = true } = {}) {
        root.dataset.theme = resolvedTheme();
        root.dataset.motion = preferences.motion;
        root.dataset.contrast = preferences.contrast;
        root.dataset.fontSize = preferences.fontSize;
        root.dataset.audio = preferences.audio ? "on" : "off";
        if (persist) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(preferences));
            } catch (error) {
                console.warn("PyBlocks settings could not be saved.", error);
            }
        }
        const workspace = window.PyBlocksWorkspace;
        if (workspace) {
            const background =
                resolvedTheme() === "light" ? "#eef1f8" : "#0f111a";
            workspace
                .getParentSvg()
                ?.querySelector(".blocklyMainBackground")
                ?.setAttribute("fill", background);
            workspace
                .getParentSvg()
                ?.querySelector(".blocklyGridPattern")
                ?.setAttribute(
                    "visibility",
                    preferences.grid ? "visible" : "hidden",
                );
            Blockly.svgResize(workspace);
        }
        document.dispatchEvent(
            new CustomEvent("pyblocks:settings-changed", {
                detail: { ...preferences, resolvedTheme: resolvedTheme() },
            }),
        );
    }

    function element(tag, properties = {}, children = []) {
        const node = document.createElement(tag);
        for (const [key, value] of Object.entries(properties)) {
            if (key === "className") node.className = value;
            else if (key === "text") node.textContent = value;
            else if (key.startsWith("aria-")) node.setAttribute(key, value);
            else node[key] = value;
        }
        node.append(...children.filter(Boolean));
        return node;
    }

    const backdrop = element("div", {
        className: "settings-backdrop",
        hidden: true,
        "aria-hidden": "true",
    });
    const title = element("h2", {
        id: "settings-title",
        text: "PyBlocks Settings",
    });
    const description = element("p", {
        id: "settings-description",
        text: "Preferences are saved on this device.",
    });
    const closeButton = element("button", {
        className: "settings-close",
        type: "button",
        text: "×",
        "aria-label": "Close settings",
    });
    const header = element("div", { className: "settings-header" }, [
        element("div", {}, [title, description]),
        closeButton,
    ]);
    const options = element("div", { className: "settings-options" });
    const footer = element("div", {
        className: "settings-footer",
        text: "Theme and accessibility settings apply across Home, License, and Create.",
    });
    const panel = element(
        "section",
        {
            className: "settings-panel",
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "settings-title",
            "aria-describedby": "settings-description",
        },
        [header, options, footer],
    );
    backdrop.append(panel);
    document.body.append(backdrop);

    const themeSelect = element("select", { "aria-label": "Appearance" });
    [
        ["dark", "Dark"],
        ["light", "Light"],
        ["system", "System"],
    ].forEach(([value, label]) =>
        themeSelect.append(element("option", { value, text: label })),
    );
    function copy(titleText, descriptionText) {
        return element("span", { className: "setting-copy" }, [
            element("strong", { text: titleText }),
            element("small", { text: descriptionText }),
        ]);
    }
    options.append(
        element("label", { className: "setting-row" }, [
            copy("Appearance", "Choose the interface theme."),
            themeSelect,
        ]),
    );

    const toggles = new Map();
    [
        ["motion", "Reduce motion", "Pause decorative animations."],
        ["contrast", "High contrast", "Strengthen borders and text."],
        ["fontSize", "Larger text", "Increase interface readability."],
        ["grid", "Workspace grid", "Show alignment dots in the editor."],
        ["audio", "Block sounds", "Play quiet feedback while moving blocks."],
    ].forEach(([key, titleText, descriptionText]) => {
        const toggle = element("button", {
            className: "setting-switch",
            type: "button",
            role: "switch",
            "aria-label": titleText,
        });
        toggle.dataset.toggle = key;
        toggles.set(key, toggle);
        options.append(
            element("div", { className: "setting-row" }, [
                copy(titleText, descriptionText),
                toggle,
            ]),
        );
    });
    const reset = element("button", {
        className: "settings-reset",
        type: "button",
        text: "Reset settings",
    });
    footer.prepend(reset);

    function sync() {
        themeSelect.value = preferences.theme;
        const states = {
            motion: preferences.motion === "reduced",
            contrast: preferences.contrast === "high",
            fontSize: preferences.fontSize === "large",
            grid: preferences.grid,
            audio: preferences.audio,
        };
        Object.entries(states).forEach(([key, enabled]) =>
            toggles.get(key)?.setAttribute("aria-checked", String(enabled)),
        );
    }
    function close() {
        window.PyBlocksDialogs.close(backdrop);
        document
            .querySelectorAll("[data-settings-button]")
            .forEach((button) => button.setAttribute("aria-expanded", "false"));
    }
    document.querySelectorAll("[data-settings-button]").forEach((button) => {
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("aria-expanded", "false");
        button.addEventListener("click", () => {
            button.setAttribute("aria-expanded", "true");
            sync();
            window.PyBlocksDialogs.open(backdrop, {
                opener: button,
                initialFocus: themeSelect,
                onEscape: close,
            });
        });
    });
    closeButton.addEventListener("click", close);
    backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) close();
    });
    themeSelect.addEventListener("change", () => {
        preferences.theme = themeSelect.value;
        apply();
        sync();
    });
    toggles.forEach((toggle, key) =>
        toggle.addEventListener("click", () => {
            if (key === "motion")
                preferences.motion =
                    preferences.motion === "reduced" ? "full" : "reduced";
            if (key === "contrast")
                preferences.contrast =
                    preferences.contrast === "high" ? "normal" : "high";
            if (key === "fontSize")
                preferences.fontSize =
                    preferences.fontSize === "large" ? "normal" : "large";
            if (key === "grid" || key === "audio")
                preferences[key] = !preferences[key];
            apply();
            sync();
        }),
    );
    reset.addEventListener("click", () => {
        preferences = { ...defaults };
        apply();
        sync();
    });
    systemTheme.addEventListener("change", () => {
        if (preferences.theme === "system") apply({ persist: false });
    });
    apply({ persist: false });
    sync();
    window.PyBlocksSettings = {
        get: () => ({ ...preferences }),
        reset: () => {
            preferences = { ...defaults };
            apply();
            sync();
        },
    };
})();
