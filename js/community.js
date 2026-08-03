"use strict";

(() => {
    const page = document.body.dataset.page;
    const status = (message) => {
        const node = document.getElementById("dashboard-status");
        if (node) node.textContent = message;
    };
    const isOwner = (profile) =>
        profile?.role === "owner" ||
        profile?.username?.toLowerCase() === "goldl00x";
    const EXPERIENCED_AGE_MS = 30 * 24 * 60 * 60 * 1000;
    const EXPERIENCED_ACTIVE_SECONDS = 2 * 60 * 60;
    const EXPERIENCED_PROJECTS = 5;

    function profileTitle(profile, publishedCount) {
        if (isOwner(profile)) return "PYBLOCKS CREATOR";
        const oldEnough =
            Date.now() - new Date(profile.joined_at).getTime() >=
            EXPERIENCED_AGE_MS;
        if (
            oldEnough &&
            Number(profile.active_seconds) >= EXPERIENCED_ACTIVE_SECONDS &&
            publishedCount >= EXPERIENCED_PROJECTS
        )
            return "EXPERIENCED";
        return "NEWCOMER";
    }

    function showAvatar(container, profile) {
        const image = container?.querySelector("[data-avatar-image]");
        const fallback = container?.querySelector(".default-avatar");
        const url = window.PyBlocksCloud.avatarUrl(profile);
        if (!image || !fallback || !url) return;
        image.alt = `${profile.display_name || profile.username}'s profile picture`;
        image.addEventListener(
            "load",
            () => {
                image.hidden = false;
                fallback.hidden = true;
            },
            { once: true },
        );
        image.addEventListener(
            "error",
            () => {
                image.hidden = true;
                fallback.hidden = false;
            },
            { once: true },
        );
        image.src = `${url}?v=${encodeURIComponent(profile.updated_at || profile.avatar_path)}`;
    }

    function formatDuration(seconds) {
        const minutes = Math.floor(Number(seconds || 0) / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 48) return `${hours}h ${minutes % 60}m`;
        return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    }

    function empty(message) {
        const node = document.createElement("p");
        node.className = "community-empty";
        node.textContent = message;
        return node;
    }

    function profileCard(profile) {
        const link = document.createElement("a");
        link.className = `profile-card${isOwner(profile) ? " owner-card" : ""}`;
        link.href = `profile.html?user=${encodeURIComponent(profile.username)}`;
        const title = document.createElement("strong");
        title.textContent = profile.display_name || profile.username;
        const meta = document.createElement("span");
        meta.textContent = `@${profile.username} · Joined ${new Date(profile.joined_at).toLocaleDateString()}`;
        link.append(title, meta);
        if (isOwner(profile)) {
            const badge = document.createElement("b");
            badge.className = "owner-badge";
            badge.textContent = "OWNER";
            link.append(badge);
        }
        return link;
    }

    function publicProjectCard(project, profileMap) {
        const article = document.createElement("article");
        article.className = "project-card";
        const author = profileMap.get(project.user_id);
        const heading = document.createElement("h3");
        const link = document.createElement("a");
        link.href = `project.html?id=${encodeURIComponent(project.id)}`;
        link.textContent = project.name;
        heading.append(link);
        const description = document.createElement("p");
        description.textContent =
            project.description ||
            "A visual Python project built with PyBlocks.";
        const footer = document.createElement("div");
        const authorLink = document.createElement("a");
        authorLink.href = author
            ? `profile.html?user=${encodeURIComponent(author.username)}`
            : "#";
        authorLink.textContent = author
            ? `@${author.username}`
            : "PyBlocks creator";
        const date = document.createElement("span");
        date.textContent = new Date(
            project.published_at || project.updated_at,
        ).toLocaleDateString();
        footer.append(authorLink, date);
        article.append(heading, description, footer);
        return article;
    }

    async function renderPublished(container, projects) {
        container.replaceChildren();
        if (!projects.length) {
            container.append(empty("No published projects found."));
            return;
        }
        const profiles = await window.PyBlocksCloud.getProfiles(
            projects.map((project) => project.user_id),
        );
        const profileMap = new Map(
            profiles.map((profile) => [profile.user_id, profile]),
        );
        projects.forEach((project) =>
            container.append(publicProjectCard(project, profileMap)),
        );
    }

    function editableProjectCard(project, refresh) {
        const article = document.createElement("article");
        article.className = "project-card editable-project";
        const name = document.createElement("input");
        name.value = project.name;
        name.maxLength = 120;
        name.setAttribute("aria-label", `Name for ${project.name}`);
        const description = document.createElement("textarea");
        description.value = project.description || "";
        description.maxLength = 500;
        description.placeholder = "Add a short project description…";
        description.setAttribute(
            "aria-label",
            `Description for ${project.name}`,
        );
        const controls = document.createElement("div");
        const publishedLabel = document.createElement("label");
        const published = document.createElement("input");
        published.type = "checkbox";
        published.checked = project.is_published;
        publishedLabel.append(published, " Published");
        const save = document.createElement("button");
        save.type = "button";
        save.className = "compact-action";
        save.textContent = "Save changes";
        save.addEventListener("click", async () => {
            save.disabled = true;
            status(`Saving ${name.value}…`);
            try {
                await window.PyBlocksCloud.updateProjectMetadata(project.id, {
                    name: name.value.trim() || "Untitled",
                    description: description.value.trim(),
                    isPublished: published.checked,
                });
                status("Project details saved.");
                await refresh();
            } catch (error) {
                status(error.message);
            } finally {
                save.disabled = false;
            }
        });
        const edit = document.createElement("a");
        edit.className = "compact-action secondary";
        edit.href = `editor.html?cloud=${encodeURIComponent(project.id)}`;
        edit.textContent = "Open editor";
        controls.append(publishedLabel, edit, save);
        article.append(name, description, controls);
        return article;
    }

    async function initDashboard() {
        const user = window.PyBlocksCloud.currentUser();
        if (!user) {
            window.location.replace("index.html");
            return;
        }
        const profile = await window.PyBlocksCloud.ensureProfile();
        const projects = await window.PyBlocksCloud.listProjects();
        const publishedCount = projects.filter(
            (project) => project.is_published,
        ).length;
        document.getElementById("dashboard-display-name").textContent =
            profile.display_name || profile.username;
        document.getElementById("dashboard-username").textContent =
            `@${profile.username}`;
        document.getElementById("dashboard-title").textContent = profileTitle(
            profile,
            publishedCount,
        );
        showAvatar(document.querySelector("[data-profile-avatar]"), profile);
        if (isOwner(profile)) {
            document
                .getElementById("profile-hero")
                .classList.add("owner-profile");
            const badge = document.createElement("span");
            badge.className = "owner-badge";
            badge.textContent = "OWNER";
            document.getElementById("dashboard-username").after(badge);
        }
        document.getElementById("stat-active").textContent = formatDuration(
            profile.active_seconds,
        );
        document.getElementById("stat-joined").textContent = new Date(
            profile.joined_at,
        ).toLocaleDateString();
        document.getElementById("stat-published").textContent = projects.filter(
            (project) => project.is_published,
        ).length;

        const settingsForm = document.getElementById("profile-settings-form");
        const displayNameInput = document.getElementById(
            "profile-display-name",
        );
        const avatarInput = document.getElementById("profile-avatar-file");
        const settingsStatus = document.getElementById(
            "profile-settings-status",
        );
        displayNameInput.value = profile.display_name || profile.username;
        settingsForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const button = settingsForm.querySelector("button[type='submit']");
            button.disabled = true;
            settingsStatus.textContent = "Saving profile…";
            try {
                let updated = await window.PyBlocksCloud.updateProfile(
                    displayNameInput.value,
                );
                if (avatarInput.files[0])
                    updated = await window.PyBlocksCloud.uploadAvatar(
                        avatarInput.files[0],
                    );
                document.getElementById("dashboard-display-name").textContent =
                    updated.display_name;
                showAvatar(
                    document.querySelector("[data-profile-avatar]"),
                    updated,
                );
                avatarInput.value = "";
                settingsStatus.textContent = "Profile saved.";
            } catch (error) {
                settingsStatus.textContent = error.message;
            } finally {
                button.disabled = false;
            }
        });

        const myProjects = document.getElementById("my-projects");
        const refreshMine = async () => {
            const refreshed = await window.PyBlocksCloud.listProjects();
            myProjects.replaceChildren();
            if (!refreshed.length)
                myProjects.append(
                    empty("Create your first cloud project in the editor."),
                );
            refreshed.forEach((project) =>
                myProjects.append(editableProjectCard(project, refreshMine)),
            );
        };
        await refreshMine();

        const results = document.getElementById("community-results");
        await renderPublished(
            results,
            await window.PyBlocksCloud.listPublishedProjects(20),
        );
        let resultType = "projects";
        document.querySelectorAll("[data-result-type]").forEach((button) => {
            button.addEventListener("click", () => {
                resultType = button.dataset.resultType;
                document
                    .querySelectorAll("[data-result-type]")
                    .forEach((item) =>
                        item.classList.toggle("is-active", item === button),
                    );
                document.getElementById("community-search").requestSubmit();
            });
        });
        document
            .getElementById("community-search")
            .addEventListener("submit", async (event) => {
                event.preventDefault();
                const query = document
                    .getElementById("community-query")
                    .value.trim();
                results.replaceChildren(empty("Searching…"));
                if (resultType === "users") {
                    const users = query
                        ? await window.PyBlocksCloud.searchUsers(query)
                        : [];
                    results.replaceChildren();
                    if (!users.length) results.append(empty("No users found."));
                    users.forEach((item) => results.append(profileCard(item)));
                } else {
                    const matches = query
                        ? await window.PyBlocksCloud.searchProjects(query)
                        : await window.PyBlocksCloud.listPublishedProjects(20);
                    await renderPublished(results, matches);
                }
            });
        document
            .getElementById("community-signout")
            .addEventListener("click", async () => {
                await window.PyBlocksCloud.signOut();
                window.location.href = "index.html";
            });
        window.setInterval(() => {
            if (!document.hidden) void window.PyBlocksCloud.recordActivity(60);
        }, 60_000);
        status(`${projects.length} project${projects.length === 1 ? "" : "s"}`);
    }

    async function initProfile() {
        const username =
            new window.URLSearchParams(window.location.search).get("user") ||
            "";
        const profile =
            await window.PyBlocksCloud.getProfileByUsername(username);
        if (!profile) {
            document.getElementById("public-username").textContent =
                "User not found";
            return;
        }
        const projects = await window.PyBlocksCloud.listPublishedByUser(
            profile.user_id,
        );
        document.title = `${profile.display_name || profile.username} — PyBlocks`;
        document.getElementById("public-display-name").textContent =
            profile.display_name || profile.username;
        document.getElementById("public-username").textContent =
            `@${profile.username}`;
        document.getElementById("public-title").textContent = profileTitle(
            profile,
            projects.length,
        );
        document.getElementById("public-joined").textContent =
            `Joined ${new Date(profile.joined_at).toLocaleDateString()} · ${formatDuration(profile.active_seconds)} active`;
        showAvatar(document.querySelector("[data-profile-avatar]"), profile);
        if (isOwner(profile)) {
            document
                .getElementById("profile-hero")
                .classList.add("owner-profile");
            document.getElementById("owner-badge").hidden = false;
        }
        await renderPublished(
            document.getElementById("public-projects"),
            projects,
        );
    }

    async function initProject() {
        const id = new window.URLSearchParams(window.location.search).get("id");
        const record = await window.PyBlocksCloud.loadPublishedProject(id);
        const [author] = await window.PyBlocksCloud.getProfiles([
            record.user_id,
        ]);
        document.title = `${record.name} — PyBlocks`;
        document.getElementById("project-detail-name").textContent =
            record.name;
        const authorNode = document.getElementById("project-detail-author");
        authorNode.textContent = author
            ? `Built by @${author.username}`
            : "Built with PyBlocks";
        document.getElementById("project-detail-description").textContent =
            record.description ||
            "A visual Python project built with PyBlocks.";
        document.getElementById("project-detail-code").textContent = [
            `# ${record.project.name}`,
            record.project.libraries?.length
                ? `# Libraries: ${record.project.libraries.join(", ")}`
                : "# No extra libraries",
            "# Open this creator's published project in PyBlocks.",
        ].join("\n");
    }

    async function initDiscover() {
        const params = new window.URLSearchParams(window.location.search);
        const query = params.get("q")?.trim() || "";
        let resultType = params.get("type") === "users" ? "users" : "projects";
        const input = document.getElementById("public-query");
        const results = document.getElementById("public-search-results");
        const searchStatus = document.getElementById("public-search-status");
        input.value = query;

        async function render() {
            results.replaceChildren(empty("Searching…"));
            document
                .querySelectorAll("[data-result-type]")
                .forEach((button) =>
                    button.classList.toggle(
                        "is-active",
                        button.dataset.resultType === resultType,
                    ),
                );
            if (resultType === "users") {
                const users = query
                    ? await window.PyBlocksCloud.searchUsers(query)
                    : [];
                results.replaceChildren();
                if (!users.length)
                    results.append(
                        empty(
                            query
                                ? "No users matched your search."
                                : "Enter a username to search creators.",
                        ),
                    );
                users.forEach((profile) =>
                    results.append(profileCard(profile)),
                );
                searchStatus.textContent = query
                    ? `${users.length} user result${users.length === 1 ? "" : "s"}`
                    : "Search creators by username";
                return;
            }
            const projects = query
                ? await window.PyBlocksCloud.searchProjects(query)
                : await window.PyBlocksCloud.listPublishedProjects(20);
            await renderPublished(results, projects);
            searchStatus.textContent = query
                ? `${projects.length} project result${projects.length === 1 ? "" : "s"}`
                : "Showing recent published projects";
        }

        document.querySelectorAll("[data-result-type]").forEach((button) => {
            button.addEventListener("click", () => {
                resultType = button.dataset.resultType;
                params.set("type", resultType);
                if (query) params.set("q", query);
                window.history.replaceState(
                    null,
                    "",
                    `discover.html?${params.toString()}`,
                );
                void render();
            });
        });
        await render();
    }

    Promise.resolve()
        .then(() => {
            if (page === "dashboard") return initDashboard();
            if (page === "profile") return initProfile();
            if (page === "project") return initProject();
            if (page === "discover") return initDiscover();
            return null;
        })
        .catch((error) => {
            status(error.message);
            const heading = document.querySelector("h1");
            if (heading) heading.textContent = "Something went wrong";
        });
})();
