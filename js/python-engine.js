'use strict';

window.PythonEngine = {
    workspace: null,
    selectedLibraries: new Set(),
    worker: null,
    runToken: 0,
    inputRequest: null,
    running: false,
    dirty: false,
    autosaveTimer: null,
    storageKey: 'pyblocks-autosave-v1',
    projectName: 'Untitled',

    init(workspace) {
        this.workspace = workspace;
        this.dom = {
            run: document.getElementById('run-btn'),
            stop: document.getElementById('stop-btn'),
            preview: document.getElementById('python-preview'),
            output: document.getElementById('console-output'),
            inputForm: document.getElementById('console-input-form'),
            inputLabel: document.getElementById('console-input-label'),
            input: document.getElementById('console-input')
        };
        this.dom.run.addEventListener('click', () => this.runCode());
        this.dom.stop.addEventListener('click', () => this.stopCode());
        document.getElementById('export-btn').addEventListener('click', () => this.exportCode());
        document.getElementById('clear-console-btn').addEventListener('click', () => this.clearConsole());
        this.dom.inputForm.addEventListener('submit', event => {
            event.preventDefault();
            if (!this.worker || !this.inputRequest) return;
            this.worker.postMessage({type: 'input-response', id: this.inputRequest, value: this.dom.input.value});
            this.inputRequest = null;
            this.dom.inputForm.hidden = true;
            this.dom.input.value = '';
        });
        this.updatePreview();
    },

    generatePythonCode() {
        if (!this.workspace) return '';
        const eventBlock = this.workspace.getBlocksByType('py_when_run', false).find(block => !block.isInsertionMarker());
        const functionBlocks = this.workspace.getBlocksByType('py_function_hat', false).filter(block => !block.isInsertionMarker());
        if (!eventBlock && functionBlocks.length === 0) return '';
        const generator = window.python.pythonGenerator;
        generator.init(this.workspace);
        let code = '';
        try {
            const definitions = functionBlocks.map(block => {
                const generated = generator.blockToCode(block);
                return Array.isArray(generated) ? generated[0] : generated;
            }).join('\n');
            let eventCode = '';
            if (eventBlock) {
                const generated = generator.blockToCode(eventBlock);
                eventCode = Array.isArray(generated) ? generated[0] : generated;
            }
            code = generator.finish([definitions, eventCode].filter(Boolean).join('\n'));
        } finally {
            generator.nameDB_?.reset();
        }
        const imports = [...this.selectedLibraries].sort().map(moduleName => `import ${moduleName}`).join('\n');
        return [imports, code.trim()].filter(Boolean).join('\n\n').trimEnd();
    },

    setLibraries(libraries, {markDirty = true} = {}) {
        this.selectedLibraries = new Set(window.PyBlocksProjectFormat.normalizeLibraries(libraries));
        this.updatePreview();
        document.dispatchEvent(new CustomEvent('pyblocks:libraries-changed', {detail: [...this.selectedLibraries]}));
        if (markDirty) this.markChanged();
    },

    updatePreview() {
        if (!this.dom?.preview) return;
        this.dom.preview.textContent = this.generatePythonCode() || '# Connect blocks beneath the Events block to run them...';
    },

    showNotice(message) { this.appendConsole(`> ${message}`, 'text-muted'); },
    showError(message) { this.appendConsole(`> ${message}`, 'text-danger'); },

    importRawPython(sourceCode) {
        if (!this.workspace) return;
        const code = String(sourceCode).replace(/^\uFEFF/, '').replace(/^# When Run Python clicked\s*\r?\n?/, '');
        const state = Blockly.serialization.workspaces.save(this.workspace);
        Blockly.Events.setGroup(true);
        try {
            this.workspace.clear();
            const eventBlock = this.workspace.newBlock('py_when_run');
            eventBlock.initSvg(); eventBlock.render(); eventBlock.moveBy(70, 60);
            if (code) {
                const codeBlock = this.workspace.newBlock('py_raw_code');
                codeBlock.data = code;
                const lineCount = code.split(/\r?\n/).length;
                codeBlock.setFieldValue(`${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`, 'SUMMARY');
                codeBlock.initSvg(); codeBlock.render();
                eventBlock.nextConnection.connect(codeBlock.previousConnection);
            }
        } catch (error) {
            this.workspace.clear();
            Blockly.serialization.workspaces.load(state, this.workspace);
            throw error;
        } finally { Blockly.Events.setGroup(false); }
        this.markChanged();
        Blockly.svgResize(this.workspace);
        this.showNotice('Python was imported losslessly as raw source. It was not converted into visual blocks.');
    },

    clearConsole(message = '> Ready') {
        this.dom.output.replaceChildren();
        this.appendConsole(message, 'text-muted');
    },

    appendConsole(text, className = '') {
        const fragments = String(text).replace(/\r/g, '').split('\n');
        if (fragments.at(-1) === '') fragments.pop();
        for (const fragment of fragments) {
            const line = document.createElement('div');
            line.className = `console-line ${className}`.trim();
            line.textContent = fragment;
            this.dom.output.appendChild(line);
        }
        this.dom.output.scrollTop = this.dom.output.scrollHeight;
    },

    setRunning(running, status) {
        this.running = running;
        this.dom.run.disabled = running;
        this.dom.stop.disabled = !running;
        this.dom.run.textContent = running ? (status || 'Running…') : 'Run Python';
    },

    async runCode() {
        if (this.running) return;
        const code = this.generatePythonCode();
        this.clearConsole('> Preparing browser Python…');
        if (!code.trim()) return this.showNotice('Add blocks before running.');
        const token = ++this.runToken;
        this.setRunning(true, 'Loading…');
        const worker = new Worker('js/python-worker.js');
        this.worker = worker;
        worker.addEventListener('message', event => {
            if (token !== this.runToken || worker !== this.worker) return;
            const message = event.data || {};
            if (message.type === 'stdout') this.appendConsole(message.text);
            if (message.type === 'status') {
                this.setRunning(true, message.status === 'loading' ? 'Loading…' : 'Running…');
                this.showNotice(message.message);
            }
            if (message.type === 'input') {
                this.inputRequest = message.id;
                this.dom.inputLabel.textContent = message.prompt || 'Python is waiting for input';
                this.dom.inputForm.hidden = false;
                this.dom.input.focus();
            }
            if (message.type === 'complete') {
                this.appendConsole('> Process finished with code 0', 'text-muted');
                this.finishRun(worker);
            }
            if (message.type === 'error') {
                const where = message.line ? ` on generated line ${message.line}` : '';
                this.appendConsole(`> ${message.name}${where}: ${message.message}`, 'text-danger');
                if (message.line) this.appendConsole(`> ${this.sourceLine(code, message.line)}`, 'text-danger');
                this.appendConsole('> Process finished with code 1', 'text-danger');
                this.finishRun(worker);
            }
        });
        worker.addEventListener('error', event => {
            if (worker !== this.worker) return;
            this.showError(`Python runtime failed to load: ${event.message || 'worker error'}`);
            this.finishRun(worker);
        });
        worker.postMessage({type: 'run', code});
    },

    sourceLine(code, line) {
        const source = code.split(/\r?\n/)[line - 1] || '';
        return `${line} | ${source}`;
    },

    stopCode() {
        if (!this.worker) return;
        this.runToken += 1;
        this.worker.terminate();
        this.worker = null;
        this.inputRequest = null;
        this.dom.inputForm.hidden = true;
        this.setRunning(false);
        this.showNotice('Execution stopped. The Python runtime was reset.');
    },

    finishRun(worker) {
        if (worker !== this.worker) return;
        worker.terminate();
        this.worker = null;
        this.inputRequest = null;
        this.dom.inputForm.hidden = true;
        this.setRunning(false);
    },

    markChanged() {
        this.dirty = true;
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = setTimeout(() => this.saveAutosave(), 350);
    },

    buildProject() {
        return window.PyBlocksProjectFormat.create(
            Blockly.serialization.workspaces.save(this.workspace),
            [...this.selectedLibraries],
            this.projectName
        );
    },

    saveAutosave() {
        try { localStorage.setItem(this.storageKey, JSON.stringify(this.buildProject())); }
        catch (error) { this.showError(`Autosave failed: ${error.message}`); }
    },

    restoreAutosave() {
        const saved = localStorage.getItem(this.storageKey);
        if (!saved) return false;
        try { this.loadProject(window.PyBlocksProjectFormat.parse(saved), {saved: true}); return true; }
        catch (error) {
            localStorage.removeItem(this.storageKey);
            this.showError(`Saved project could not be restored and was left unopened: ${error.message}`);
            return false;
        }
    },

    loadProject(project, {saved = true} = {}) {
        const valid = window.PyBlocksProjectFormat.validate(project);
        const previous = Blockly.serialization.workspaces.save(this.workspace);
        try {
            this.workspace.clear();
            Blockly.serialization.workspaces.load(valid.workspace, this.workspace);
        } catch (error) {
            this.workspace.clear();
            Blockly.serialization.workspaces.load(previous, this.workspace);
            throw new Error(`Blockly workspace data is invalid: ${error.message}`);
        }
        this.projectName = valid.name;
        this.setLibraries(valid.libraries, {markDirty: false});
        this.dirty = !saved;
        this.updatePreview();
    },

    newProject() {
        this.stopCode();
        this.workspace.clear();
        this.projectName = 'Untitled';
        this.setLibraries([], {markDirty: false});
        this.dirty = false;
        localStorage.removeItem(this.storageKey);
        this.clearConsole();
    },

    download(content, filename, type) {
        const blob = new Blob([content], {type});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = filename;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    saveProject() {
        const requested = window.prompt('Project filename:', `${this.projectName === 'Untitled' ? 'my-project' : this.projectName}.pyblocks`);
        if (!requested) return;
        const base = requested.replace(/\.pyblocks$/i, '').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').trim() || 'my-project';
        this.projectName = base;
        this.download(`${JSON.stringify(this.buildProject(), null, 2)}\n`, `${base}.pyblocks`, 'application/json;charset=utf-8');
        this.dirty = false;
        this.saveAutosave();
    },

    exportCode() {
        const requested = window.prompt('Python filename:', 'pyblocks-script.py');
        if (!requested) return;
        const filename = (requested.replace(/\.py$/i, '').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').trim() || 'pyblocks-script') + '.py';
        this.download(`${this.generatePythonCode().trimEnd()}\n`, filename, 'text/x-python;charset=utf-8');
    }
};
