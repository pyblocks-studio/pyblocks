"use strict";

window.PyBlocksDialogs = (() => {
    const focusableSelector =
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const active = new Map();

    function open(
        container,
        { opener = document.activeElement, initialFocus, onEscape } = {},
    ) {
        if (!container || active.has(container)) return;
        const inerted = [...document.body.children].filter(
            (node) =>
                node !== container && !node.contains(container) && !node.inert,
        );
        inerted.forEach((node) => {
            node.inert = true;
        });
        container.hidden = false;
        container.setAttribute("aria-hidden", "false");
        const keydown = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                (onEscape || (() => close(container)))();
                return;
            }
            if (event.key !== "Tab") return;
            const focusable = [
                ...container.querySelectorAll(focusableSelector),
            ].filter((node) => node.offsetParent !== null);
            if (!focusable.length) {
                event.preventDefault();
                return;
            }
            const first = focusable[0];
            const last = focusable.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        container.addEventListener("keydown", keydown);
        active.set(container, { opener, inerted, keydown });
        (initialFocus || container.querySelector(focusableSelector))?.focus();
    }

    function close(container) {
        const state = active.get(container);
        if (!state) {
            if (container) container.hidden = true;
            return;
        }
        container.hidden = true;
        container.setAttribute("aria-hidden", "true");
        container.removeEventListener("keydown", state.keydown);
        state.inerted.forEach((node) => {
            node.inert = false;
        });
        active.delete(container);
        setTimeout(() => state.opener?.focus?.(), 0);
    }

    return { open, close };
})();
