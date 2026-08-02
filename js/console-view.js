"use strict";

window.PyBlocksConsoleView = class {
    constructor(output) {
        if (!output) throw new Error("Console output element is missing.");
        this.output = output;
    }

    clear(message = "> Ready") {
        this.output.replaceChildren();
        this.append(message, "text-muted");
    }

    append(text, className = "") {
        const fragments = String(text).replace(/\r/g, "").split("\n");
        if (fragments.at(-1) === "") fragments.pop();
        for (const fragment of fragments) {
            const line = document.createElement("div");
            line.className = `console-line ${className}`.trim();
            line.textContent = fragment;
            this.output.appendChild(line);
        }
        this.output.scrollTop = this.output.scrollHeight;
    }
};
