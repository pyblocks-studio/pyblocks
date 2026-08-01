(() => {
    const storageKey = 'pyblocks-preferences';
    const defaults = {theme:'dark', motion:'full', contrast:'normal', fontSize:'normal', grid:true};
    let preferences;
    try { preferences = {...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}')}; }
    catch { preferences = {...defaults}; }

    const apply = () => {
        const root = document.documentElement;
        root.dataset.theme = resolvedTheme();
        root.dataset.motion = preferences.motion;
        root.dataset.contrast = preferences.contrast;
        root.dataset.fontSize = preferences.fontSize;
        localStorage.setItem(storageKey, JSON.stringify(preferences));

        const workspace = window.PyBlocksWorkspace;
        if (workspace) {
            const background = preferences.theme === 'light' ? '#eef1f8' : '#0f111a';
            workspace.getParentSvg()?.querySelector('.blocklyMainBackground')?.setAttribute('fill', background);
            workspace.getParentSvg()?.querySelector('.blocklyGridPattern')?.setAttribute('visibility', preferences.grid ? 'visible' : 'hidden');
        }
    };

    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.motion = preferences.motion;
    document.documentElement.dataset.contrast = preferences.contrast;
    document.documentElement.dataset.fontSize = preferences.fontSize;

    const backdrop = document.createElement('div');
    backdrop.className = 'settings-backdrop';
    backdrop.hidden = true;
    backdrop.innerHTML = `
        <section class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div class="settings-header">
                <div><h2 id="settings-title">PyBlocks Settings</h2><p>Preferences are saved on this device.</p></div>
                <button class="settings-close" type="button" aria-label="Close settings">×</button>
            </div>
            <div class="settings-options">
                <label class="setting-row"><span class="setting-copy"><strong>Appearance</strong><small>Choose the interface theme.</small></span>
                    <select data-setting="theme"><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label>
                <div class="setting-row"><span class="setting-copy"><strong>Reduce motion</strong><small>Pause decorative animations.</small></span>
                    <button class="setting-switch" type="button" data-toggle="motion" role="switch"></button></div>
                <div class="setting-row"><span class="setting-copy"><strong>High contrast</strong><small>Strengthen borders and text.</small></span>
                    <button class="setting-switch" type="button" data-toggle="contrast" role="switch"></button></div>
                <div class="setting-row"><span class="setting-copy"><strong>Larger text</strong><small>Increase interface readability.</small></span>
                    <button class="setting-switch" type="button" data-toggle="fontSize" role="switch"></button></div>
                <div class="setting-row"><span class="setting-copy"><strong>Workspace grid</strong><small>Show alignment dots in the editor.</small></span>
                    <button class="setting-switch" type="button" data-toggle="grid" role="switch"></button></div>
            </div>
            <div class="settings-footer">Theme and accessibility settings apply across Home, License, and Create.</div>
        </section>`;
    document.body.appendChild(backdrop);

    const themeSelect = backdrop.querySelector('[data-setting="theme"]');
    const resolvedTheme = () => preferences.theme === 'system'
        ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : preferences.theme;

    const sync = () => {
        themeSelect.value = preferences.theme;
        document.documentElement.dataset.theme = resolvedTheme();
        const states = {
            motion: preferences.motion === 'reduced',
            contrast: preferences.contrast === 'high',
            fontSize: preferences.fontSize === 'large',
            grid: preferences.grid
        };
        Object.entries(states).forEach(([key, enabled]) => {
            backdrop.querySelector(`[data-toggle="${key}"]`)?.setAttribute('aria-checked', String(enabled));
        });
    };

    const close = () => {
        backdrop.hidden = true;
        document.querySelector('[data-settings-button][aria-expanded="true"]')?.setAttribute('aria-expanded', 'false');
    };

    document.querySelectorAll('[data-settings-button]').forEach(button => {
        button.addEventListener('click', () => {
            backdrop.hidden = false;
            button.setAttribute('aria-expanded', 'true');
            sync();
            themeSelect.focus();
        });
    });
    backdrop.querySelector('.settings-close').addEventListener('click', close);
    backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !backdrop.hidden) close(); });

    themeSelect.addEventListener('change', () => {
        preferences.theme = themeSelect.value;
        document.documentElement.dataset.theme = resolvedTheme();
        apply();
    });
    backdrop.querySelectorAll('[data-toggle]').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const key = toggle.dataset.toggle;
            if (key === 'motion') preferences.motion = preferences.motion === 'reduced' ? 'full' : 'reduced';
            if (key === 'contrast') preferences.contrast = preferences.contrast === 'high' ? 'normal' : 'high';
            if (key === 'fontSize') preferences.fontSize = preferences.fontSize === 'large' ? 'normal' : 'large';
            if (key === 'grid') preferences.grid = !preferences.grid;
            apply(); sync();
        });
    });

    if (preferences.theme === 'system') {
        matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
            document.documentElement.dataset.theme = resolvedTheme();
        });
    }
    document.addEventListener('DOMContentLoaded', () => { apply(); sync(); });
})();
