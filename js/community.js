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
        title.textContent = `@${profile.username}`;
        const meta = document.createElement("span");
        meta.textContent = `Joined ${new Date(profile.joined_at).toLocaleDateString()}`;
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
        const heading = document.getElementById("dashboard-username");
        heading.textContent = `@${profile.username}`;
        if (isOwner(profile)) {
            document
                .getElementById("profile-hero")
                .classList.add("owner-profile");
            const badge = document.createElement("span");
            badge.className = "owner-badge";
            badge.textContent = "OWNER";
            heading.after(badge);
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
        document.title = `@${profile.username} — PyBlocks`;
        document.getElementById("public-username").textContent =
            `@${profile.username}`;
        document.getElementById("public-joined").textContent =
            `Joined ${new Date(profile.joined_at).toLocaleDateString()} · ${formatDuration(profile.active_seconds)} active`;
        if (isOwner(profile)) {
            document
                .getElementById("profile-hero")
                .classList.add("owner-profile");
            document.getElementById("owner-badge").hidden = false;
        }
        await renderPublished(
            document.getElementById("public-projects"),
            await window.PyBlocksCloud.listPublishedByUser(profile.user_id),
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

    Promise.resolve()
        .then(() => {
            if (page === "dashboard") return initDashboard();
            if (page === "profile") return initProfile();
            if (page === "project") return initProject();
            return null;
        })
        .catch((error) => {
            status(error.message);
            const heading = document.querySelector("h1");
            if (heading) heading.textContent = "Something went wrong";
        });
})();
