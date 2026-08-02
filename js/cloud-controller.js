"use strict";

window.PyBlocksCloudController = (() => {
    let dialog;
    let opener;

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
            for (const project of projects) list.append(projectRow(project));
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
        const size = Math.max(1, Math.round(project.uncompressed_bytes / 1024));
        meta.textContent = `${size} KB before compression · ${new Date(project.updated_at).toLocaleString()}`;
        details.append(title, meta);

        const actions = document.createElement("div");
        const open = document.createElement("button");
        open.type = "button";
        open.className = "btn btn-secondary";
        open.textContent = "Open";
        open.addEventListener("click", () => openProject(project));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "text-button danger-action";
        remove.textContent = "Delete";
        remove.addEventListener("click", () => deleteProject(project));
        actions.append(open, remove);
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
            window.PythonEngine.loadProject(loaded, { saved: true });
            window.PythonEngine.saveAutosave();
            setStatus(`Opened ${project.name}.`);
            close();
        } catch (error) {
            setStatus(error.message, true);
        }
    }

    async function deleteProject(project) {
        if (!window.confirm(`Delete ${project.name} from the cloud?`)) return;
        try {
            await window.PyBlocksCloud.deleteProject(project.id);
            await renderProjects();
        } catch (error) {
            setStatus(error.message, true);
        }
    }

    async function saveCurrentProject() {
        const requested = window.prompt(
            "Cloud project name:",
            window.PythonEngine.projectName === "Untitled"
                ? "My project"
                : window.PythonEngine.projectName,
        );
        if (!requested) return;
        window.PythonEngine.projectName =
            requested.trim().slice(0, 120) || "My project";
        setStatus("Compressing and saving project…");
        try {
            await window.PyBlocksCloud.saveProject(
                window.PythonEngine.buildProject(),
            );
            window.PythonEngine.dirty = false;
            window.PythonEngine.updateSaveStatus("Saved to cloud");
            await renderProjects();
        } catch (error) {
            setStatus(error.message, true);
        }
    }

    async function submitAuth(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const mode = form.elements.mode.value;
        const values = {
            username: form.elements.username.value.trim(),
            email: form.elements.email.value.trim(),
            password: form.elements.password.value,
        };
        setStatus(mode === "signup" ? "Creating account…" : "Signing in…");
        try {
            if (mode === "signup") {
                const result = await window.PyBlocksCloud.signUp(values);
                setStatus(result.message);
                if (!result.signedIn) return;
            } else await window.PyBlocksCloud.signIn(values);
            form.reset();
            updateAccountButton();
            show("projects");
            await renderProjects();
        } catch (error) {
            setStatus(error.message, true);
        }
    }

    function open(event) {
        opener = event?.currentTarget || document.activeElement;
        const user = window.PyBlocksCloud.currentUser();
        show(user ? "projects" : "auth");
        document.getElementById("cloud-user-label").textContent = user
            ? `${user.username} (${user.email})`
            : "Not signed in";
        if (!window.PyBlocksCloud.configured())
            setStatus(
                "Cloud setup is required. Follow docs/CLOUD_SETUP.md, then add the public connection values to js/cloud-config.js.",
                true,
            );
        else if (user) void renderProjects();
        else setStatus("Sign in or create an account.");
        window.PyBlocksDialogs.open(dialog, {
            opener,
            initialFocus: dialog.querySelector("input, button"),
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
            .addEventListener("click", saveCurrentProject);
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
                const signingUp = event.target.value === "signup";
                usernameField.hidden = !signingUp;
                usernameField.querySelector("input").required = signingUp;
            });
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) close();
        });
        document.addEventListener(
            "pyblocks:cloud-session",
            updateAccountButton,
        );
        updateAccountButton();
    }

    return { init, open };
})();
