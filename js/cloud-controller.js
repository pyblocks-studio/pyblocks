"use strict";

window.PyBlocksCloudController = (() => {
    let dialog;
    let opener;
    let currentProjectId = null;
    let currentPublished = false;
    let autosaveTimer = null;

    function setStatus(message, error = false) {
        const status = document.getElementById("cloud-status");
        status.textContent = message;
        status.classList.toggle("text-danger", error);
    }

    function show(view) {
        document.getElementById("cloud-auth-view").hidden = view !== "auth";
        document.getElementById("cloud-projects-view").hidden =
            view !== "projects";
    }

    function updateAccountButton() {
        const user = window.PyBlocksCloud.currentUser();
        const button = document.getElementById("account-btn");
        button.textContent = user ? user.username : "Sign in";
        button.classList.toggle("is-signed-in", Boolean(user));
    }

    function syncProjectName(name = window.PythonEngine.projectName) {
        const input = document.getElementById("project-name-input");
        if (input && input.value !== name) input.value = name;
    }

    async function renderProjects() {
        const list = document.getElementById("cloud-project-list");
        list.replaceChildren();
        setStatus("Loading cloud projects…");
        try {
            const projects = await window.PyBlocksCloud.listProjects();
            if (!projects.length) {
                const empty = document.createElement("p");
                empty.className = "cloud-empty";
                empty.textContent = "No cloud projects yet.";
                list.append(empty);
            }
            projects.forEach((project) => list.append(projectRow(project)));
            setStatus(
                `${projects.length} cloud project${projects.length === 1 ? "" : "s"}`,
            );
        } catch (error) {
            setStatus(error.message, true);
        }
    }

    function projectRow(project) {
        const row = document.createElement("article");
        row.className = "cloud-project-row";
        const details = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = project.name;
        const meta = document.createElement("small");
        meta.textContent = `${project.is_published ? "Published" : "Draft"} · ${new Date(project.updated_at).toLocaleString()}`;
        details.append(title, meta);
        const actions = document.createElement("div");
        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "btn btn-secondary";
        openButton.textContent = "Open";
        openButton.addEventListener("click", () => void openProject(project));
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "text-button danger-action";
        removeButton.textContent = "Delete";
        removeButton.addEventListener(
            "click",
            () => void deleteProject(project),
        );
        actions.append(openButton, removeButton);
        row.append(details, actions);
        return row;
    }

    async function openProject(project) {
        if (
            window.PythonEngine.dirty &&
            !window.confirm(
                `Opening ${project.name} will replace unsaved changes. Continue?`,
            )
        )
            return;
        setStatus(`Opening ${project.name}…`);
        try {
            const loaded = await window.PyBlocksCloud.loadProject(project.id);
            currentProjectId = project.id;
            currentPublished = Boolean(project.is_published);
            const attribution = project.remixed_from_project_id
                ? {
                      projectId: project.remixed_from_project_id,
                      projectName: project.remixed_from_name,
                      username: project.remixed_from_username,
                  }
                : null;
            window.PythonEngine.loadProject(
                { ...loaded, attribution },
                { saved: true },
            );
            window.PythonEngine.saveAutosave();
            close();
        } catch (error) {
            setStatus(error.message, true);
        }
    }

    async function deleteProject(project) {
        if (!window.confirm(`Delete ${project.name} from the cloud?`)) return;
        try {
            await window.PyBlocksCloud.deleteProject(project.id);
            if (currentProjectId === project.id) currentProjectId = null;
            await renderProjects();
        } catch (error) {
            setStatus(error.message, true);
        }
    }

    async function saveCurrentProject({ quiet = false } = {}) {
        if (!window.PyBlocksCloud.currentUser()) {
            if (!quiet)
                open({ currentTarget: document.getElementById("account-btn") });
            return;
        }
        const input = document.getElementById("project-name-input");
        window.PythonEngine.projectName =
            input.value.trim().slice(0, 120) || "Untitled";
        input.value = window.PythonEngine.projectName;
        if (!quiet) setStatus("Compressing and saving project…");
        try {
            await window.PyBlocksCloud.ensureProfile();
            const project = window.PythonEngine.buildProject();
            const saved = await window.PyBlocksCloud.saveProject(project, {
                id: currentProjectId,
                isPublished: currentPublished,
                remixAttribution: project.attribution,
            });
            currentProjectId = saved?.id || currentProjectId;
            window.PythonEngine.dirty = false;
            window.PythonEngine.updateSaveStatus("Saved to cloud");
            if (!quiet && !dialog.hidden) await renderProjects();
        } catch (error) {
            if (quiet)
                window.PythonEngine.updateSaveStatus("Cloud autosave failed");
            else setStatus(error.message, true);
        }
    }

    function scheduleAutosave() {
        clearTimeout(autosaveTimer);
        if (!window.PyBlocksCloud.currentUser()) return;
        window.PythonEngine.updateSaveStatus("Autosave queued");
        autosaveTimer = setTimeout(
            () => void saveCurrentProject({ quiet: true }),
            1800,
        );
    }

    async function submitAuth(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = {
            username: form.elements.username.value.trim(),
            identifier: form.elements.identifier.value.trim(),
            email: form.elements.email.value.trim(),
            password: form.elements.password.value,
        };
        const signingUp = form.elements.mode.value === "signup";
        setStatus(signingUp ? "Creating account…" : "Signing in…");
        try {
            if (signingUp) {
                const result = await window.PyBlocksCloud.signUp(values);
                setStatus(result.message);
                if (!result.signedIn) return;
            } else {
                await window.PyBlocksCloud.signIn(values);
            }
            await window.PyBlocksCloud.ensureProfile();
            form.reset();
            updateAccountButton();
            close();
        } catch (error) {
            setStatus(error.message, true);
        }
    }

    function open(event) {
        opener = event?.currentTarget || document.activeElement;
        const user = window.PyBlocksCloud.currentUser();
        if (user) {
            window.location.href = "dashboard.html";
            return;
        }
        show("auth");
        document.getElementById("cloud-user-label").textContent =
            "Not signed in";
        setStatus(
            window.PyBlocksCloud.configured()
                ? "Sign in or create an account."
                : "Cloud setup is required. Follow docs/CLOUD_SETUP.md.",
            !window.PyBlocksCloud.configured(),
        );
        window.PyBlocksDialogs.open(dialog, {
            opener,
            initialFocus: dialog.querySelector("select"),
            onEscape: close,
        });
    }

    function close() {
        window.PyBlocksDialogs.close(dialog);
    }

    function init() {
        dialog = document.getElementById("cloud-dialog");
        document.getElementById("account-btn").addEventListener("click", open);
        document
            .getElementById("cloud-close-btn")
            .addEventListener("click", close);
        document
            .getElementById("cloud-auth-form")
            .addEventListener("submit", submitAuth);
        document
            .getElementById("cloud-save-btn")
            .addEventListener("click", () => void saveCurrentProject());
        document
            .getElementById("save-now-btn")
            .addEventListener("click", () => void saveCurrentProject());
        document
            .getElementById("cloud-signout-btn")
            .addEventListener("click", async () => {
                await window.PyBlocksCloud.signOut();
                updateAccountButton();
                show("auth");
                setStatus("Signed out.");
            });
        document
            .getElementById("auth-mode")
            .addEventListener("change", (event) => {
                const usernameField = document.getElementById("username-field");
                const emailField = document.getElementById("email-field");
                const identifierField =
                    document.getElementById("identifier-field");
                const forgotButton = document.getElementById(
                    "forgot-password-btn",
                );
                const signingUp = event.target.value === "signup";
                usernameField.hidden = !signingUp;
                usernameField.querySelector("input").required = signingUp;
                emailField.hidden = !signingUp;
                emailField.querySelector("input").required = signingUp;
                identifierField.hidden = signingUp;
                identifierField.querySelector("input").required = !signingUp;
                forgotButton.hidden = signingUp;
            });
        document
            .getElementById("forgot-password-btn")
            .addEventListener("click", async () => {
                const form = document.getElementById("cloud-auth-form");
                const identifier = form.elements.identifier.value.trim();
                if (!identifier) {
                    setStatus("Enter your username or email first.", true);
                    form.elements.identifier.focus();
                    return;
                }
                setStatus("Sending a secure reset link…");
                try {
                    setStatus(
                        await window.PyBlocksCloud.requestPasswordReset(
                            identifier,
                        ),
                    );
                } catch (error) {
                    setStatus(error.message, true);
                }
            });
        document
            .getElementById("project-name-input")
            .addEventListener("input", (event) => {
                window.PythonEngine.projectName =
                    event.target.value.trim().slice(0, 120) || "Untitled";
                window.PythonEngine.markChanged();
            });
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) close();
        });
        document.addEventListener(
            "pyblocks:cloud-session",
            updateAccountButton,
        );
        document.addEventListener("pyblocks:project-changed", scheduleAutosave);
        document.addEventListener("pyblocks:realtime", (event) => {
            if (
                event.detail.table === "pyblocks_projects" &&
                !dialog.hidden &&
                window.PyBlocksCloud.currentUser()
            )
                void renderProjects();
        });
        document.addEventListener("pyblocks:project-loaded", (event) => {
            syncProjectName(event.detail?.name);
            if (event.detail?.isNew) {
                currentProjectId = null;
                currentPublished = false;
            }
        });
        window.setInterval(() => {
            if (!document.hidden && window.PyBlocksCloud.currentUser())
                void window.PyBlocksCloud.recordActivity(60);
        }, 60_000);
        updateAccountButton();
        syncProjectName();
        const params = new window.URLSearchParams(window.location.search);
        const requestedProjectId = params.get("cloud");
        const requestedRemixId = params.get("remix");
        const requestedViewId = params.get("view");
        if (requestedViewId) {
            void window.PyBlocksCloud.loadPublishedProject(requestedViewId)
                .then((record) => {
                    currentProjectId = null;
                    currentPublished = false;
                    window.PythonEngine.loadProject(record.project, {
                        saved: true,
                    });
                    const nameInput =
                        document.getElementById("project-name-input");
                    nameInput.readOnly = true;
                    nameInput.setAttribute(
                        "aria-label",
                        "Published project name (read only)",
                    );
                    const remixLink = document.createElement("a");
                    remixLink.className = "btn btn-primary view-remix-link";
                    remixLink.href = `editor.html?remix=${encodeURIComponent(record.id)}`;
                    remixLink.textContent = "Remix project";
                    document
                        .querySelector(".project-title-controls")
                        .append(remixLink);
                    document.title = `Viewing ${record.name} — PyBlocks`;
                    window.PythonEngine.updateSaveStatus(
                        "Viewing published project · read only",
                    );
                })
                .catch((error) => window.PythonEngine.showError(error.message));
        } else if (requestedRemixId) {
            void window.PyBlocksCloud.loadPublishedProject(requestedRemixId)
                .then(async (record) => {
                    const [author] = await window.PyBlocksCloud.getProfiles([
                        record.user_id,
                    ]);
                    const source = record.remixed_from_project_id
                        ? {
                              projectId: record.remixed_from_project_id,
                              projectName: record.remixed_from_name,
                              username: record.remixed_from_username,
                          }
                        : {
                              projectId: record.id,
                              projectName: record.name,
                              username: author?.username || "unknown",
                          };
                    currentProjectId = null;
                    currentPublished = false;
                    const remix = {
                        ...record.project,
                        name: `Remix of ${record.name}`.slice(0, 120),
                        attribution: source,
                    };
                    window.PythonEngine.loadProject(remix, { saved: false });
                    window.PythonEngine.saveAutosave();
                    window.PythonEngine.showNotice(
                        `Remixing ${record.name} with credit to @${source.username}.`,
                    );
                })
                .catch((error) => window.PythonEngine.showError(error.message));
        } else if (requestedProjectId && window.PyBlocksCloud.currentUser()) {
            void window.PyBlocksCloud.listProjects()
                .then((projects) =>
                    projects.find(
                        (project) => project.id === requestedProjectId,
                    ),
                )
                .then((project) => {
                    if (project) return openProject(project);
                    return null;
                });
        }
    }

    return { init, open, saveCurrentProject };
})();
