'use strict';

const SKULPT_VERSION = '1.2.0';
let inputSequence = 0;
const pendingInputs = new Map();

function requestInput(prompt) {
    const id = ++inputSequence;
    self.postMessage({type: 'input', id, prompt: String(prompt || '')});
    return new Promise((resolve, reject) => pendingInputs.set(id, {resolve, reject}));
}

function runtimeRead(path) {
    const files = self.Sk?.builtinFiles?.files;
    if (!files || !Object.prototype.hasOwnProperty.call(files, path)) {
        throw new Error(`The browser runtime does not include module file: ${path}`);
    }
    return files[path];
}

async function ensureRuntime() {
    if (self.Sk) return;
    self.postMessage({type: 'status', status: 'loading', message: `Loading Python runtime (Skulpt ${SKULPT_VERSION})…`});
    importScripts(
        `https://cdn.jsdelivr.net/npm/skulpt@${SKULPT_VERSION}/dist/skulpt.min.js`,
        `https://cdn.jsdelivr.net/npm/skulpt@${SKULPT_VERSION}/dist/skulpt-stdlib.js`
    );
}

self.addEventListener('message', async event => {
    const message = event.data || {};
    if (message.type === 'input-response') {
        const pending = pendingInputs.get(message.id);
        if (pending) {
            pendingInputs.delete(message.id);
            pending.resolve(String(message.value ?? ''));
        }
        return;
    }
    if (message.type !== 'run') return;

    try {
        await ensureRuntime();
        self.Sk.configure({
            output: text => self.postMessage({type: 'stdout', text: String(text)}),
            read: runtimeRead,
            inputfun: requestInput,
            inputfunTakesPrompt: true,
            __future__: self.Sk.python3
        });
        self.postMessage({type: 'status', status: 'running', message: 'Running Python…'});
        await self.Sk.misceval.asyncToPromise(() => self.Sk.importMainWithBody('<pyblocks>', false, message.code, true));
        self.postMessage({type: 'complete'});
    } catch (error) {
        const traceback = Array.isArray(error?.traceback) ? error.traceback : [];
        const last = traceback[traceback.length - 1] || {};
        self.postMessage({
            type: 'error',
            name: error?.tp$name || error?.name || 'PythonError',
            message: String(error?.toString?.() || error || 'Unknown Python error'),
            line: Number(last.lineno) || null
        });
    }
});
