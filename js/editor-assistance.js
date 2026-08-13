"use strict";

window.PyBlocksEditorAssistance = (() => {
    const TUTORIAL_KEY = "pyblocks-editor-tutorial-v1";
    let pygameDismissed = false;
    let dragging = null;

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

    function initHelp() {
        const dialog = document.getElementById("help-dialog");
        const open = () =>
            window.PyBlocksDialogs.open(dialog, {
                opener: document.getElementById("help-btn"),
                initialFocus: document.getElementById("help-close-btn"),
                onEscape: close,
            });
        const close = () => window.PyBlocksDialogs.close(dialog);
        document.getElementById("help-btn").addEventListener("click", open);
        document
            .getElementById("help-close-btn")
            .addEventListener("click", close);
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) close();
        });
        document
            .getElementById("restart-tutorial-btn")
            .addEventListener("click", () => {
                close();
                startTutorial();
            });
    }

    function startTutorial() {
        const layer = document.getElementById("tutorial-layer");
        const focus = document.getElementById("tutorial-focus");
        const card = document.getElementById("tutorial-card");
        const text = document.getElementById("tutorial-step");
        const next = document.getElementById("tutorial-next");
        const steps = [
            [
                "#blockly-workspace",
                "This is your workspace. Open Events in the block palette and drag out the ‘when Run Python clicked’ block. Only blocks connected beneath it will run.",
            ],
            [
                "#libraries-btn",
                "Libraries add new Python tools. Enable one only when your project needs it.",
            ],
            [
                "#run-btn",
                "Click Run Python to execute the connected blocks in the browser console.",
            ],
            [
                "#menu-btn",
                "The project menu lets you save a .pyblocks project or export Python. Exported Python cannot be imported back into blocks.",
            ],
            [
                "#help-btn",
                "Open Help any time for block-shaped examples and essential Python syntax.",
            ],
        ];
        let index = 0;
        const finish = () => {
            layer.hidden = true;
            localStorage.setItem(TUTORIAL_KEY, "complete");
        };
        const render = () => {
            if (index >= steps.length) return finish();
            const target = document.querySelector(steps[index][0]);
            const rect = target.getBoundingClientRect();
            focus.style.cssText = `left:${rect.left - 6}px;top:${rect.top - 6}px;width:${rect.width + 12}px;height:${rect.height + 12}px`;
            text.textContent = steps[index][1];
            next.textContent = index === steps.length - 1 ? "Finish" : "Next";
            const cardTop = rect.bottom + 16;
            card.style.left = `${Math.max(12, Math.min(window.innerWidth - 350, rect.left))}px`;
            card.style.top = `${cardTop + 190 < window.innerHeight ? cardTop : Math.max(12, rect.top - 180)}px`;
        };
        next.onclick = () => {
            index += 1;
            render();
        };
        document.getElementById("tutorial-skip").onclick = finish;
        layer.hidden = false;
        render();
    }

    function init(_workspace, { isViewMode }) {
        initPygameWindow();
        initHelp();
        if (!isViewMode && !localStorage.getItem(TUTORIAL_KEY))
            setTimeout(startTutorial, 500);
    }

    return { init, setPygameEnabled, startTutorial };
})();
