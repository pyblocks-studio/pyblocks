window.PythonEngine = {
    workspace: null,
    selectedLibraries: new Set(),

    init(workspace) {
        this.workspace = workspace;
        document.getElementById('run-btn').addEventListener('click', () => this.runCode());
        document.getElementById('export-btn').addEventListener('click', () => this.exportCode());
        document.getElementById('clear-console-btn').addEventListener('click', () => this.clearConsole());
        this.updatePreview();
    },

    generatePythonCode() {
        if (!this.workspace) return '';

        const eventBlock = this.workspace
            .getBlocksByType('py_when_run', false)
            .find((block) => !block.isInsertionMarker());

        const functionBlocks = this.workspace
            .getBlocksByType('py_function_hat', false)
            .filter((block) => !block.isInsertionMarker());

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
            code = [definitions, eventCode].filter(Boolean).join('\n');
            code = generator.finish(code || '');
        } finally {
            generator.nameDB_?.reset();
        }

        const imports = [...this.selectedLibraries]
            .sort()
            .map(moduleName => `import ${moduleName}`)
            .join('\n');
        const program = code.trim();
        return [imports, program].filter(Boolean).join('\n\n').trimEnd();
    },

    setLibraries(libraries) {
        this.selectedLibraries = new Set(libraries);
        this.updatePreview();
    },

    updatePreview() {
        const code = this.generatePythonCode();
        document.getElementById('python-preview').textContent =
            code || '# Connect blocks beneath the Events block to run them...';
    },

    showNotice(message) {
        this.appendConsole(`> ${message}`, 'text-muted');
    },

    showError(message) {
        this.appendConsole(`> ${message}`, 'text-danger');
    },

    importCode(sourceCode) {
        if (!this.workspace) return;

        const code = sourceCode
            .replace(/^\uFEFF/, '')
            .replace(/^# When Run Python clicked\s*\r?\n?/, '')
            .replace(/\s+$/, '');

        Blockly.Events.setGroup(true);
        try {
            this.workspace.clear();

            const eventBlock = this.workspace.newBlock('py_when_run');
            eventBlock.initSvg();
            eventBlock.render();
            eventBlock.moveBy(70, 60);

            if (code) {
                const codeBlock = this.workspace.newBlock('py_raw_code');
                const lineCount = code.split(/\r?\n/).length;
                codeBlock.data = code;
                codeBlock.setFieldValue(
                    `${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`,
                    'SUMMARY'
                );
                codeBlock.initSvg();
                codeBlock.render();
                eventBlock.nextConnection.connect(codeBlock.previousConnection);
            }
        } finally {
            Blockly.Events.setGroup(false);
        }

        this.updatePreview();
        Blockly.svgResize(this.workspace);
        this.showNotice('Python code imported into the event stack.');
    },

    clearConsole() {
        document.getElementById('console-output').innerHTML =
            '<div class="console-line text-muted">&gt; Ready</div>';
    },

    appendConsole(text, className = '') {
        const line = document.createElement('div');
        line.className = `console-line ${className}`.trim();
        line.textContent = text;
        const consoleOutput = document.getElementById('console-output');
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    },

    async runCode() {
        const code = this.generatePythonCode();
        const consoleOutput = document.getElementById('console-output');
        consoleOutput.innerHTML = '';

        if (!code.trim()) {
            this.appendConsole('> Add blocks before running.', 'text-muted');
            return;
        }

        this.appendConsole('> Executing Python blocks...');

        try {
            const output = this.executeSupportedPython(code);
            output.forEach((value) => this.appendConsole(String(value)));
            if (output.length === 0) {
                this.appendConsole('> (Program completed with no output)', 'text-muted');
            }
            this.appendConsole('> Process finished with code 0');
        } catch (error) {
            this.appendConsole(`> [STDERR] ${error.message}`, 'text-danger');
            this.appendConsole('> Process finished with code 1', 'text-danger');
        }
    },

    executeSupportedPython(code) {
        const variables = Object.create(null);
        const output = [];
        const lines = code.split(/\r?\n/);
        const functions = Object.create(null);
        const topLevel = [];

        for (let index = 0; index < lines.length; index += 1) {
            const rawLine = lines[index];
            const line = rawLine.trim();
            const definition = line.match(/^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:\s*$/);
            if (definition && rawLine.length === rawLine.trimStart().length) {
                const body = [];
                while (index + 1 < lines.length) {
                    const nextLine = lines[index + 1];
                    if (nextLine.trim() && nextLine.length === nextLine.trimStart().length) break;
                    index += 1;
                    if (nextLine.trim()) body.push(nextLine.replace(/^(?: {2}|\t)/, ''));
                }
                functions[definition[1]] = {
                    parameters: definition[2].split(',').map(item => item.trim()).filter(Boolean),
                    body
                };
                continue;
            }
            topLevel.push(rawLine);
        }

        this.executeStatements(topLevel, variables, functions, output);
        return output;
    },

    executeStatements(lines, variables, functions, output) {
        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index].trim();
            if (!line || line.startsWith('#') || line.startsWith('import ') || line === 'pass') continue;

            const assignment = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
            if (assignment) {
                variables[assignment[1]] = this.evaluateExpression(
                    assignment[2], variables, functions, output
                );
                continue;
            }

            const printCall = line.match(/^print\((.*)\)$/);
            if (printCall) {
                output.push(this.evaluateExpression(
                    printCall[1], variables, functions, output
                ));
                continue;
            }

            const returnStatement = line.match(/^return(?:\s+(.+))?$/);
            if (returnStatement) {
                return {
                    returned: true,
                    value: returnStatement[1]
                        ? this.evaluateExpression(returnStatement[1], variables, functions, output)
                        : null
                };
            }

            if (/^[A-Za-z_]\w*\s*\(.*\)$/.test(line)) {
                this.evaluateExpression(line, variables, functions, output);
                continue;
            }

            throw new Error(`The browser runner does not support line ${index + 1}: ${line}`);
        }
        return {returned: false, value: null};
    },

    evaluateExpression(expression, variables, functions = Object.create(null), output = []) {
        const value = expression.trim();

        if (value in variables) {
            return variables[value];
        }
        if (value === 'True') return true;
        if (value === 'False') return false;
        if (value === 'None') return null;
        if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) return Number(value);

        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
            return this.decodePythonString(value);
        }

        const functionCall = value.match(/^([A-Za-z_]\w*)\s*\((.*)\)$/);
        if (functionCall && functions[functionCall[1]]) {
            const definition = functions[functionCall[1]];
            const argumentText = this.splitArguments(functionCall[2]);
            const argumentValues = argumentText.map(argument =>
                this.evaluateExpression(argument, variables, functions, output)
            );
            const localVariables = Object.create(variables);
            definition.parameters.forEach((parameter, index) => {
                localVariables[parameter] = argumentValues[index] ?? null;
            });
            return this.executeStatements(
                definition.body, localVariables, functions, output
            ).value;
        }

        const operation = value.match(/^(.+?)\s*(\+|-|\*|\/|\/\/|%|\*\*)\s*(.+)$/);
        if (operation) {
            const left = this.evaluateExpression(operation[1], variables, functions, output);
            const right = this.evaluateExpression(operation[3], variables, functions, output);
            switch (operation[2]) {
                case '+': return left + right;
                case '-': return left - right;
                case '*': return left * right;
                case '/': return left / right;
                case '//': return Math.floor(left / right);
                case '%': return left % right;
                case '**': return left ** right;
                default: break;
            }
        }

        throw new Error(`Unable to evaluate: ${value}`);
    },

    splitArguments(source) {
        if (!source.trim()) return [];
        const argumentsList = [];
        let current = '';
        let depth = 0;
        let quote = null;
        let escaped = false;

        for (const character of source) {
            if (quote) {
                current += character;
                if (escaped) escaped = false;
                else if (character === '\\') escaped = true;
                else if (character === quote) quote = null;
                continue;
            }
            if (character === '"' || character === "'") {
                quote = character;
                current += character;
            } else if ('([{'.includes(character)) {
                depth += 1;
                current += character;
            } else if (')]}'.includes(character)) {
                depth -= 1;
                current += character;
            } else if (character === ',' && depth === 0) {
                argumentsList.push(current.trim());
                current = '';
            } else {
                current += character;
            }
        }
        if (current.trim()) argumentsList.push(current.trim());
        return argumentsList;
    },

    decodePythonString(value) {
        const quote = value[0];
        const body = value.slice(1, -1);
        return body
            .replace(/\\\\/g, '\u0000')
            .replace(new RegExp(`\\\\${quote}`, 'g'), quote)
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\u0000/g, '\\');
    },

    exportCode() {
        const code = this.generatePythonCode();
        const blob = new Blob([`${code}\n`], { type: 'text/x-python;charset=utf-8' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = 'pyblocks-script.py';
        link.click();
        URL.revokeObjectURL(url);
    }
};
