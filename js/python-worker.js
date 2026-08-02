"use strict";

const SKULPT_VERSION = "1.2.0";
let inputSequence = 0;
const pendingInputs = new Map();

function requestInput(prompt) {
    const id = ++inputSequence;
    self.postMessage({ type: "input", id, prompt: String(prompt || "") });
    return new Promise((resolve, reject) =>
        pendingInputs.set(id, { resolve, reject }),
    );
}

function runtimeRead(path) {
    const files = self.Sk?.builtinFiles?.files;
    if (!files || !Object.prototype.hasOwnProperty.call(files, path)) {
        throw new Error(
            `The browser runtime does not include module file: ${path}`,
        );
    }
    return files[path];
}

async function ensureRuntime() {
    if (self.Sk) return;
    self.postMessage({
        type: "status",
        status: "loading",
        message: `Loading Python runtime (Skulpt ${SKULPT_VERSION})…`,
    });
    importScripts(
        "../vendor/skulpt/skulpt.min.js",
        "../vendor/skulpt/skulpt-stdlib.js",
    );
}

function astValue(value, seen = new WeakSet()) {
    if (
        value == null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    )
        return value;
    if (Array.isArray(value)) return value.map((item) => astValue(item, seen));
    if (typeof value !== "object") return String(value);
    if (seen.has(value)) return null;
    if (typeof value.v === "string" || typeof value.v === "number")
        return value.v;
    seen.add(value);
    const result = {
        type: value._astname || value.constructor?.name || "Object",
    };
    for (const key of Object.keys(value)) {
        if (key.startsWith("$") || key === "ctx") continue;
        const item = value[key];
        if (typeof item === "function") continue;
        result[key] = astValue(item, seen);
    }
    seen.delete(value);
    return result;
}

self.addEventListener("message", async (event) => {
    const message = event.data || {};
    if (message.type === "input-response") {
        const pending = pendingInputs.get(message.id);
        if (pending) {
            pendingInputs.delete(message.id);
            pending.resolve(String(message.value ?? ""));
        }
        return;
    }
    if (message.type === "parse") {
        try {
            await ensureRuntime();
            self.Sk.configure({
                read: runtimeRead,
                __future__: self.Sk.python3,
            });
            const parsed = self.Sk.parse(
                "<import>",
                String(message.code || ""),
            );
            const ast = self.Sk.astFromParse(
                parsed.cst,
                "<import>",
                parsed.flags,
            );
            self.postMessage({ type: "parsed", ast: astValue(ast) });
        } catch (error) {
            const traceback = Array.isArray(error?.traceback)
                ? error.traceback
                : [];
            const last = traceback[traceback.length - 1] || {};
            self.postMessage({
                type: "parse-error",
                name: error?.tp$name || error?.name || "SyntaxError",
                message: String(error?.toString?.() || error),
                line: Number(last.lineno || error?.lineno) || null,
                column: Number(error?.offset) || null,
            });
        }
        return;
    }
    if (message.type !== "run") return;

    try {
        await ensureRuntime();
        self.Sk.configure({
            output: (text) =>
                self.postMessage({ type: "stdout", text: String(text) }),
            read: runtimeRead,
            inputfun: requestInput,
            inputfunTakesPrompt: true,
            __future__: self.Sk.python3,
        });
        self.postMessage({
            type: "status",
            status: "running",
            message: "Running Python…",
        });
        await self.Sk.misceval.asyncToPromise(() =>
            self.Sk.importMainWithBody("<pyblocks>", false, message.code, true),
        );
        self.postMessage({ type: "complete" });
    } catch (error) {
        const traceback = Array.isArray(error?.traceback)
            ? error.traceback
            : [];
        const last = traceback[traceback.length - 1] || {};
        self.postMessage({
            type: "error",
            name: error?.tp$name || error?.name || "PythonError",
            message: String(
                error?.toString?.() || error || "Unknown Python error",
            ),
            line: Number(last.lineno) || null,
        });
    }
});
