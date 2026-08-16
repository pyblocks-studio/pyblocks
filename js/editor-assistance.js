"use strict";

window.PyBlocksEditorAssistance = (() => {
    let pygameDismissed = false;
    let dragging = null;
    let guideWorkspaces = [];

    function setPygameEnabled(enabled) {
        const panel = document.getElementById("pygame-window");
        if (!panel) return;
        if (!enabled) {
            panel.hidden = true;
            pygameDismissed = false;
        } else if (!pygameDismissed) panel.hidden = false;
    }

    function initPygameWindow() {
        const panel = document.getElementById("pygame-window");
        const titlebar = document.getElementById("pygame-titlebar");
        const fullscreen = document.getElementById("pygame-fullscreen-btn");
        document
            .getElementById("pygame-close-btn")
            .addEventListener("click", () => {
                panel.hidden = true;
                pygameDismissed = true;
            });
        fullscreen.addEventListener("click", () => {
            panel.classList.toggle("is-fullscreen");
            fullscreen.textContent = panel.classList.contains("is-fullscreen")
                ? "❐"
                : "□";
            fullscreen.setAttribute(
                "aria-label",
                panel.classList.contains("is-fullscreen")
                    ? "Restore Pygame preview"
                    : "Fullscreen Pygame preview",
            );
        });
        titlebar.addEventListener("pointerdown", (event) => {
            if (
                event.target.closest("button") ||
                panel.classList.contains("is-fullscreen")
            )
                return;
            const rect = panel.getBoundingClientRect();
            dragging = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            };
            titlebar.setPointerCapture(event.pointerId);
        });
        titlebar.addEventListener("pointermove", (event) => {
            if (!dragging) return;
            panel.style.left = `${Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, event.clientX - dragging.x))}px`;
            panel.style.top = `${Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, event.clientY - dragging.y))}px`;
            panel.style.right = "auto";
            panel.style.bottom = "auto";
        });
        titlebar.addEventListener("pointerup", () => (dragging = null));
    }

    function connectValue(parent, inputName, child) {
        parent.getInput(inputName).connection.connect(child.outputConnection);
    }

    function createGuideBlock(workspace, example) {
        let block;
        let value;
        if (example === "print") {
            block = workspace.newBlock("py_print");
            value = workspace.newBlock("py_string");
            value.setFieldValue("Hello!", "TEXT");
            connectValue(block, "ARG0", value);
        } else if (example === "variable") {
            block = workspace.newBlock("py_guide_assign");
            value = workspace.newBlock("py_number");
            value.setFieldValue(0, "NUM");
            connectValue(block, "VALUE", value);
        } else if (example === "input") {
            block = workspace.newBlock("py_input");
            value = workspace.newBlock("py_string");
            value.setFieldValue("Name?", "TEXT");
            connectValue(block, "PROMPT", value);
        } else {
            block = workspace.newBlock("controls_if");
            value = workspace.newBlock("py_boolean");
            value.setFieldValue("True", "VALUE");
            connectValue(block, "IF0", value);
        }
        block.initSvg();
        value.initSvg();
        value.render();
        block.render();
        return block;
    }

    function renderGuideBlocks(editorWorkspace) {
        if (guideWorkspaces.length) {
            guideWorkspaces.forEach((workspace) =>
                Blockly.svgResize(workspace),
            );
            return;
        }
        document.querySelectorAll("[data-guide-block]").forEach((container) => {
            try {
                const workspace = Blockly.inject(container, {
                    theme: editorWorkspace.getTheme(),
                    renderer: "thrasos",
                    readOnly: true,
                    media: "vendor/blockly/media/",
                    scrollbars: false,
                    sounds: false,
                    trashcan: false,
                    zoom: {
                        controls: false,
                        wheel: false,
                        startScale: 0.72,
                        minScale: 0.45,
                        maxScale: 0.85,
                    },
                    move: { scrollbars: false, drag: false, wheel: false },
                });
                const block = createGuideBlock(
                    workspace,
                    container.dataset.guideBlock,
                );
                guideWorkspaces.push(workspace);
                Blockly.svgResize(workspace);
                workspace.zoomToFit();
                workspace.centerOnBlock(block.id);
            } catch (error) {
                console.error("Could not render Blockly guide block", error);
            }
        });
    }

    function initHelp(workspace) {
        const dialog = document.getElementById("help-dialog");
        const open = () => {
            window.PyBlocksDialogs.open(dialog, {
                opener: document.getElementById("help-btn"),
                initialFocus: document.getElementById("help-close-btn"),
                onEscape: close,
            });
            window.requestAnimationFrame(() => renderGuideBlocks(workspace));
        };
        const close = () => window.PyBlocksDialogs.close(dialog);
        document.getElementById("help-btn").addEventListener("click", open);
        document
            .getElementById("help-close-btn")
            .addEventListener("click", close);
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) close();
        });
    }

    function init(workspace) {
        initPygameWindow();
        initHelp(workspace);
    }

    return { init, setPygameEnabled };
})();
