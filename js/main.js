document.addEventListener('DOMContentLoaded', () => {
    if (!window.Blockly || !window.python?.pythonGenerator) {
        throw new Error('Blockly could not be loaded.');
    }

    const theme = Blockly.Theme.defineTheme('pyblocks', {
        base: Blockly.Themes.Classic,
        blockStyles: {
            event_blocks: { colourPrimary: '#e0af68', colourSecondary: '#c99a56', colourTertiary: '#ad8143', hat: 'cap' },
            input_blocks: { colourPrimary: '#7aa2f7', colourSecondary: '#668ddf', colourTertiary: '#5075c4' },
            misc_blocks: { colourPrimary: '#737aa2', colourSecondary: '#626987', colourTertiary: '#515770' },
            logic_blocks: { colourPrimary: '#73daca', colourSecondary: '#63c5b7', colourTertiary: '#4ca597' },
            loop_blocks: { colourPrimary: '#7aa2f7', colourSecondary: '#668ddf', colourTertiary: '#5075c4' },
            math_blocks: { colourPrimary: '#e0af68', colourSecondary: '#c99a56', colourTertiary: '#ad8143' },
            text_blocks: { colourPrimary: '#bb9af7', colourSecondary: '#a681df', colourTertiary: '#8e6ac6' },
            variable_blocks: { colourPrimary: '#ff9e64', colourSecondary: '#e88951', colourTertiary: '#cc733e' },
            variable_dynamic_blocks: { colourPrimary: '#ff9e64', colourSecondary: '#e88951', colourTertiary: '#cc733e' },
            output_blocks: { colourPrimary: '#9d7cd8', colourSecondary: '#8968c2', colourTertiary: '#7453aa' }
        },
        categoryStyles: {
            event_category: { colour: '#e0af68' },
            output_category: { colour: '#9d7cd8' },
            variable_category: { colour: '#ff9e64' },
            logic_category: { colour: '#73daca' },
            loop_category: { colour: '#7aa2f7' },
            math_category: { colour: '#e0af68' },
            text_category: { colour: '#bb9af7' }
        },
        componentStyles: {
            workspaceBackgroundColour: '#0f111a',
            toolboxBackgroundColour: '#1a1d2d',
            toolboxForegroundColour: '#a9b1d6',
            flyoutBackgroundColour: '#16161e',
            flyoutForegroundColour: '#a9b1d6',
            flyoutOpacity: 1,
            scrollbarColour: '#414868',
            scrollbarOpacity: 0.75,
            insertionMarkerColour: '#c0caf5',
            insertionMarkerOpacity: 0.35,
            cursorColour: '#c0caf5',
            blackBackground: '#0f111a'
        },
        fontStyle: {
            family: 'Segoe UI, sans-serif',
            weight: '600',
            size: 12
        },
        startHats: true
    });

    const workspace = Blockly.inject('blockly-workspace', {
        toolbox: document.getElementById('toolbox'),
        theme,
        renderer: 'thrasos',
        media: 'vendor/blockly/media/',
        grid: {
            spacing: 24,
            length: 3,
            colour: '#292e42',
            snap: true
        },
        zoom: {
            controls: true,
            wheel: true,
            startScale: 0.92,
            maxScale: 1.6,
            minScale: 0.45,
            scaleSpeed: 1.1
        },
        trashcan: true,
        move: {
            scrollbars: true,
            drag: true,
            wheel: true
        }
    });

    void configureWorkspaceAudio(workspace);
    window.PyBlocksWorkspace = workspace;
    window.PythonEngine.init(workspace);
    initProjectMenu(workspace);
    registerFunctionCategory(workspace);
    initLibrariesDialog(workspace);
    window.PythonEngine.restoreAutosave();

    const updateCode = (event) => {
        if (event?.type === Blockly.Events.BLOCK_CREATE) {
            window.PyBlocksBlocks.enforceSingleRunEvent(workspace, event.ids || []);
        }
        if (!event || !event.isUiEvent) {
            window.PythonEngine.updatePreview();
            if (event) window.PythonEngine.markChanged();
        }
        if (event && [Blockly.Events.BLOCK_CREATE, Blockly.Events.BLOCK_DELETE, Blockly.Events.BLOCK_CHANGE].includes(event.type)) {
            workspace.refreshToolboxSelection?.();
        }
    };

    workspace.addChangeListener(updateCode);
    window.addEventListener('resize', () => Blockly.svgResize(workspace));
    new ResizeObserver(() => Blockly.svgResize(workspace)).observe(document.querySelector('.workspace-panel'));
    window.addEventListener('beforeunload', event => {
        if (!window.PythonEngine.dirty) return;
        event.preventDefault();
        event.returnValue = '';
    });

    console.info('PyBlocks Studio v0.5.2 initialized with Blockly 13.2.0.');
});

async function configureWorkspaceAudio(workspace) {
    const audio = workspace.getAudioManager();
    const originalPlay = audio.play.bind(audio);
    const volumeLimits = {
        click: 0.42,
        disconnect: 0.42,
        drop: 0.48,
        delete: 0.48
    };

    audio.play = (soundName, requestedVolume = 1) => {
        const limit = volumeLimits[soundName] ?? 0.42;
        return originalPlay(soundName, Math.min(requestedVolume, limit));
    };

    await Promise.all([
        audio.load(['assets/audio/soft-click.wav'], 'click'),
        audio.load(['assets/audio/soft-disconnect.wav'], 'disconnect'),
        audio.load(['assets/audio/soft-drop.wav'], 'drop'),
        audio.load(['assets/audio/soft-delete.wav'], 'delete')
    ]);
}

function initProjectMenu(workspace) {
    const menuButton = document.getElementById('menu-btn');
    const menu = document.getElementById('project-menu');
    const importButton = document.getElementById('import-btn');
    const importInput = document.getElementById('import-file-input');
    const projectInput = document.getElementById('project-file-input');
    const confirmReplacement = action => !window.PythonEngine.dirty ||
        window.confirm(`${action} will replace unsaved changes. Continue?`);

    const setMenuOpen = (open) => {
        menu.hidden = !open;
        menuButton.setAttribute('aria-expanded', String(open));
    };

    menuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        setMenuOpen(menu.hidden);
    });

    menu.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', () => setMenuOpen(false));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setMenuOpen(false);
            menuButton.focus();
        }
    });

    importButton.addEventListener('click', () => {
        setMenuOpen(false);
        importInput.click();
    });

    importInput.addEventListener('change', async () => {
        const file = importInput.files?.[0];
        importInput.value = '';
        if (!file) return;

        if (!confirmReplacement('Importing Python')) return;

        try {
            const code = await file.text();
            window.PythonEngine.importRawPython(code);
        } catch (error) {
            window.PythonEngine.showError(`Could not import ${file.name}: ${error.message}`);
        }
    });

    document.getElementById('export-btn').addEventListener('click', () => {
        setMenuOpen(false);
    });

    document.getElementById('new-project-btn').addEventListener('click', () => {
        setMenuOpen(false);
        if (confirmReplacement('Starting a new project')) window.PythonEngine.newProject();
    });
    document.getElementById('save-project-btn').addEventListener('click', () => {
        setMenuOpen(false);
        window.PythonEngine.saveProject();
    });
    document.getElementById('open-project-btn').addEventListener('click', () => {
        setMenuOpen(false);
        if (confirmReplacement('Opening a project')) projectInput.click();
    });
    projectInput.addEventListener('change', async () => {
        const file = projectInput.files?.[0];
        projectInput.value = '';
        if (!file) return;
        if (file.size > window.PyBlocksProjectFormat.MAX_FILE_BYTES) {
            window.PythonEngine.showError('Project exceeds the 5 MB size limit.');
            return;
        }
        try {
            const project = window.PyBlocksProjectFormat.parse(await file.text());
            window.PythonEngine.loadProject(project, {saved: true});
            window.PythonEngine.saveAutosave();
            window.PythonEngine.showNotice(`Opened project: ${project.name}`);
        } catch (error) {
            window.PythonEngine.showError(`Could not open ${file.name}: ${error.message}`);
        }
    });

    document.getElementById('clear-btn').addEventListener('click', () => {
        setMenuOpen(false);
        if (workspace.getAllBlocks(false).length === 0) return;
        if (confirmReplacement('Clearing the workspace') && window.confirm('Clear every block from the workspace?')) {
            workspace.clear();
        }
    });
}

function registerFunctionCategory(workspace) {
    workspace.registerToolboxCategoryCallback('PY_FUNCTIONS', () => {
        const nodes = [];
        const definition = Blockly.utils.xml.createElement('block');
        definition.setAttribute('type', 'py_function_hat');
        nodes.push(definition);

        const returnBlock = Blockly.utils.xml.createElement('block');
        returnBlock.setAttribute('type', 'py_return');
        nodes.push(returnBlock);

        const definitions = workspace.getBlocksByType('py_function_hat', false);
        const seen = new Set();
        definitions.forEach(block => {
            const functionName = (block.getFieldValue('NAME') || 'function_name')
                .replace(/[^\w]/g, '_').replace(/^(\d)/, '_$1');
            if (seen.has(functionName)) return;
            seen.add(functionName);

            const parameters = (block.getFieldValue('PARAMS') || '')
                .split(',').map(item => item.trim().replace(/[^\w]/g, '_')).filter(Boolean);
            const call = Blockly.utils.xml.createElement('block');
            call.setAttribute('type', 'py_function_call');
            const mutation = Blockly.utils.xml.createElement('mutation');
            mutation.setAttribute('name', functionName);
            mutation.setAttribute('params', parameters.join(','));
            call.appendChild(mutation);
            nodes.push(call);
        });
        return nodes;
    });
}

function initLibrariesDialog(workspace) {
    const dialog = document.getElementById('libraries-dialog');
    const list = document.getElementById('libraries-list');
    const count = document.getElementById('libraries-count');
    const modules = [
        ['random', 'Random numbers, selections, and shuffling.'],
        ['math', 'Square roots, trigonometry, constants, and rounding.'],
        ['time', 'Timing, delays, and Unix timestamps.'],
        ['datetime', 'Dates, times, durations, and formatting.'],
        ['json', 'Read and write JSON-formatted data.'],
        ['os', 'Operating-system paths, files, and environment access.'],
        ['sys', 'Python runtime arguments and interpreter information.'],
        ['statistics', 'Mean, median, mode, and statistical functions.'],
        ['re', 'Regular-expression pattern matching.'],
        ['pathlib', 'Object-oriented filesystem paths.'],
        ['collections', 'Counters, default dictionaries, and deques.'],
        ['itertools', 'Efficient iterator building blocks.'],
        ['functools', 'Function tools such as reduce and caching.'],
        ['csv', 'Read and write CSV tabular data.'],
        ['decimal', 'Precise decimal arithmetic.'],
        ['fractions', 'Rational-number arithmetic.']
    ];

    modules.forEach(([moduleName, description]) => {
        const label = document.createElement('label');
        label.className = 'library-option';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox'; checkbox.value = moduleName;
        const strong = document.createElement('strong'); strong.textContent = moduleName;
        const small = document.createElement('small'); small.textContent = description;
        label.append(checkbox, strong, small);
        list.appendChild(label);
    });

    const refresh = () => {
        const selected = [...list.querySelectorAll('input:checked')].map(input => input.value);
        window.PythonEngine.setLibraries(selected);
        updateLibraryToolbox(workspace, selected, modules);
        count.textContent = selected.length
            ? `${selected.length} ${selected.length === 1 ? 'library' : 'libraries'} selected`
            : 'No libraries selected';
    };

    const close = () => {
        dialog.hidden = true;
        document.getElementById('libraries-btn').focus();
    };

    list.addEventListener('change', refresh);
    document.addEventListener('pyblocks:libraries-changed', event => {
        const selected = new Set(event.detail || []);
        list.querySelectorAll('input').forEach(input => { input.checked = selected.has(input.value); });
        updateLibraryToolbox(workspace, [...selected], modules);
        count.textContent = selected.size ? `${selected.size} ${selected.size === 1 ? 'library' : 'libraries'} selected` : 'No libraries selected';
    });
    document.getElementById('libraries-btn').addEventListener('click', () => {
        dialog.hidden = false;
        dialog.querySelector('input')?.focus();
    });
    document.getElementById('libraries-close-btn').addEventListener('click', close);
    document.getElementById('libraries-done-btn').addEventListener('click', close);
    dialog.addEventListener('click', event => {
        if (event.target === dialog) close();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !dialog.hidden) close();
    });
}

function updateLibraryToolbox(workspace, selected, modules) {
    const toolbox = document.getElementById('toolbox');
    toolbox.querySelectorAll('.library-category').forEach(category => category.remove());
    const anchor = document.getElementById('library-categories-anchor');

    selected.forEach((moduleName, index) => {
        const metadata = modules.find(([name]) => name === moduleName);
        const category = document.createElement('category');
        category.className = 'library-category';
        category.setAttribute('name', moduleName);
        category.setAttribute('colour', ['#7dcfff','#9ece6a','#e0af68','#f7768e','#bb9af7'][index % 5]);

        if (moduleName === 'math') {
            const mathBlock = document.createElement('block');
            mathBlock.setAttribute('type', 'py_math_function');
            category.appendChild(mathBlock);
        }
        if (moduleName === 'random') {
            ['py_random_int', 'py_random_choice'].forEach(type => {
                const block = document.createElement('block');
                block.setAttribute('type', type);
                category.appendChild(block);
            });
        }

        const genericCall = document.createElement('block');
        genericCall.setAttribute('type', 'py_library_call');
        const moduleField = document.createElement('field');
        moduleField.setAttribute('name', 'MODULE');
        moduleField.textContent = moduleName;
        const functionField = document.createElement('field');
        functionField.setAttribute('name', 'FUNCTION');
        functionField.textContent = metadata?.[0] === 'time' ? 'sleep' : 'function';
        genericCall.append(moduleField, functionField);
        category.appendChild(genericCall);
        toolbox.insertBefore(category, anchor);
    });

    workspace.updateToolbox(toolbox);
}
