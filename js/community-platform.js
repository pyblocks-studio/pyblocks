"use strict";

(() => {
    if (window.location.port === "4173") return;
    const cloud = window.PyBlocksCloud;
    if (!cloud?.configured()) return;
    const announcementTimers = new Map();
    let adminOpen = false;

    function make(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function announcementStack() {
        let stack = document.getElementById("global-announcements");
        if (!stack) {
            stack = make("section", "global-announcements");
            stack.id = "global-announcements";
            stack.setAttribute("aria-label", "PyBlocks announcements");
            stack.setAttribute("aria-live", "polite");
            document.body.prepend(stack);
        }
        return stack;
    }

    function removeAnnouncement(id) {
        document.querySelector(`[data-announcement-id="${id}"]`)?.remove();
        window.clearTimeout(announcementTimers.get(id));
        announcementTimers.delete(id);
        if (!document.querySelector(".global-announcement")) {
            document.getElementById("global-announcements")?.remove();
        }
    }

    function renderAnnouncement(announcement) {
        if (
            document.querySelector(
                `[data-announcement-id="${announcement.id}"]`,
            )
        )
            return;
        const age = Date.now() - new Date(announcement.created_at).getTime();
        const remaining = 30_000 - age;
        if (remaining <= 0) return;
        const bar = make("aside", "global-announcement");
        bar.dataset.announcementId = announcement.id;
        bar.setAttribute("role", "status");
        const author = announcement.author;
        const owner =
            author?.role === "owner" ||
            author?.username?.toLowerCase() === "goldl00x";
        const identity = make(
            "strong",
            owner ? "announcement-owner" : "",
            `${author?.username || "PyBlocks"}${owner ? " [OWNER]" : " [ADMIN]"}:`,
        );
        bar.append(
            identity,
            document.createTextNode(` ${announcement.message}`),
        );
        announcementStack().append(bar);
        announcementTimers.set(
            announcement.id,
            window.setTimeout(
                () => removeAnnouncement(announcement.id),
                remaining,
            ),
        );
    }

    async function refreshAnnouncements() {
        try {
            const announcements = await cloud.getActiveAnnouncements();
            announcements.forEach(renderAnnouncement);
        } catch {
            // Public pages remain usable if announcements cannot load.
        }
    }

    async function renderAdmins(container, owner) {
        container.replaceChildren(
            make("p", "admin-muted", "Loading access list…"),
        );
        try {
            const admins = await cloud.listAdmins();
            container.replaceChildren();
            if (!admins.length)
                container.append(
                    make("p", "admin-muted", "No additional admins."),
                );
            admins.forEach((admin) => {
                const row = make("div", "admin-access-row");
                row.append(
                    make(
                        "strong",
                        "",
                        `@${admin.profile?.username || "unknown"}`,
                    ),
                );
                if (owner) {
                    const revoke = make("button", "danger-action", "REVOKE");
                    revoke.type = "button";
                    revoke.addEventListener("click", async () => {
                        revoke.disabled = true;
                        await cloud.revokeAdmin(admin.user_id);
                        await renderAdmins(container, owner);
                    });
                    row.append(revoke);
                }
                container.append(row);
            });
        } catch (error) {
            container.replaceChildren(make("p", "admin-error", error.message));
        }
    }

    async function buildAdminDrawer(profile) {
        const owner =
            profile.role === "owner" ||
            profile.username?.toLowerCase() === "goldl00x";
        const tab = make("button", "admin-edge-tab", "A\nD\nM\nI\nN");
        tab.type = "button";
        tab.setAttribute("aria-label", "Open admin panel");
        tab.setAttribute("aria-expanded", "false");
        const drawer = make("aside", "admin-drawer");
        drawer.setAttribute("aria-label", "Admin panel");
        drawer.innerHTML = `
            <header><div><small>PYBLOCKS CONTROL</small><h2>Admin</h2></div><button type="button" data-admin-close aria-label="Close admin panel">×</button></header>
            <section><h3>Global announcement</h3><form data-announce><textarea maxlength="500" required placeholder="Message everyone…"></textarea><button class="admin-primary" type="submit">ANNOUNCE</button></form></section>
            <section><h3>Manage banners</h3><form data-banner-gift><input name="username" placeholder="Target username" required><select name="banner"></select><select name="audience"><option value="user">This user</option><option value="active">All active users</option><option value="all">All users</option></select><div class="admin-action-grid"><button class="admin-primary" type="submit">GIVE BANNER</button><button class="admin-secondary" type="button" data-revoke-banner>REVOKE BANNER</button><button class="admin-secondary" type="button" data-give-all-banners>GIVE ALL BANNERS</button><button class="danger-action" type="button" data-revoke-all-banners>REVOKE ALL BANNERS</button></div></form><p class="admin-muted">Revoke and all-banner actions only affect the typed username. Achievement banners remain protected.</p><button type="button" class="admin-secondary" data-gift-achievement>Give “Free Giveaway” gift</button></section>
            <section><h3>Profile rank tag</h3><form data-rank-tag><input name="username" placeholder="Username" required><input name="rank" maxlength="20" placeholder="ADMIN, MODERATOR, HELPER"><button class="admin-primary" type="submit">SET TAG</button></form><p class="admin-muted">Leave the tag blank to remove it. OWNER and PYBLOCKS CREATOR cannot be assigned.</p></section>
            <section data-owner-access ${owner ? "" : "hidden"}><h3>Admin access</h3><form data-admin-search><input name="username" placeholder="Type a username" required><button class="admin-secondary" type="submit">SEARCH</button></form><div class="admin-user-search" data-admin-result></div><div data-admin-list></div></section>
            <p class="admin-feedback" role="status"></p>`;
        document.body.append(tab, drawer);
        const feedback = drawer.querySelector(".admin-feedback");
        const setFeedback = (text) => {
            feedback.textContent = text;
        };
        const toggle = (open) => {
            adminOpen = open;
            drawer.classList.toggle("is-open", open);
            tab.classList.toggle("is-open", open);
            tab.setAttribute("aria-expanded", String(open));
        };
        tab.addEventListener("click", () => toggle(!adminOpen));
        drawer
            .querySelector("[data-admin-close]")
            .addEventListener("click", () => toggle(false));

        const banners = await cloud.listBanners();
        const bannerSelect = drawer.querySelector("[name='banner']");
        banners
            .filter(
                (banner) =>
                    banner.grant_level !== "automatic" &&
                    (owner || banner.grant_level !== "owner"),
            )
            .forEach((banner) => {
                const option = document.createElement("option");
                option.value = banner.id;
                option.textContent = banner.name;
                bannerSelect.append(option);
            });
        drawer
            .querySelector("[data-announce]")
            .addEventListener("submit", async (event) => {
                event.preventDefault();
                const textarea = event.currentTarget.querySelector("textarea");
                await cloud.publishAnnouncement(textarea.value);
                textarea.value = "";
                setFeedback("Announcement sent.");
                await refreshAnnouncements();
            });
        drawer
            .querySelector("[data-banner-gift]")
            .addEventListener("submit", async (event) => {
                event.preventDefault();
                const values = Object.fromEntries(
                    new window.FormData(event.currentTarget),
                );
                const count = await cloud.grantBanner(
                    values.username,
                    values.banner,
                    values.audience,
                );
                setFeedback(
                    `Banner granted to ${count} account${count === 1 ? "" : "s"}.`,
                );
            });
        const bannerForm = drawer.querySelector("[data-banner-gift]");
        const targetedBannerValues = () => {
            const values = Object.fromEntries(new window.FormData(bannerForm));
            values.username = values.username.trim();
            if (!values.username) {
                setFeedback("Type a target username first.");
                return null;
            }
            return values;
        };
        drawer
            .querySelector("[data-revoke-banner]")
            .addEventListener("click", async () => {
                const values = targetedBannerValues();
                if (!values) return;
                const count = await cloud.revokeBanner(
                    values.username,
                    values.banner,
                );
                setFeedback(
                    count
                        ? `${values.banner.toUpperCase()} revoked from @${values.username}.`
                        : "That user did not have the selected banner.",
                );
            });
        drawer
            .querySelector("[data-give-all-banners]")
            .addEventListener("click", async () => {
                const values = targetedBannerValues();
                if (!values) return;
                const count = await cloud.grantAllBanners(values.username);
                setFeedback(
                    `${count} available banner${count === 1 ? "" : "s"} granted to @${values.username}.`,
                );
            });
        drawer
            .querySelector("[data-revoke-all-banners]")
            .addEventListener("click", async () => {
                const values = targetedBannerValues();
                if (!values) return;
                if (
                    !window.confirm(
                        `Revoke every manually managed banner from @${values.username}? Achievement banners will remain.`,
                    )
                )
                    return;
                const count = await cloud.revokeAllBanners(values.username);
                setFeedback(
                    `${count} banner${count === 1 ? "" : "s"} revoked from @${values.username}.`,
                );
            });
        drawer
            .querySelector("[data-gift-achievement]")
            .addEventListener("click", async () => {
                const username = drawer
                    .querySelector("[data-banner-gift] [name='username']")
                    .value.trim();
                if (!username) return setFeedback("Type a username first.");
                const given = await cloud.giveAdminGift(username);
                setFeedback(
                    given
                        ? "Gift and Dynamic banner awarded."
                        : "User not found.",
                );
            });
        drawer
            .querySelector("[data-rank-tag]")
            .addEventListener("submit", async (event) => {
                event.preventDefault();
                const values = Object.fromEntries(
                    new window.FormData(event.currentTarget),
                );
                const changed = await cloud.setRankTag(
                    values.username,
                    values.rank,
                );
                setFeedback(
                    changed
                        ? `Rank tag updated for @${values.username}.`
                        : "User not found, or the owner tag is permanent.",
                );
            });
        if (owner) {
            const list = drawer.querySelector("[data-admin-list]");
            await renderAdmins(list, owner);
            drawer
                .querySelector("[data-admin-search]")
                .addEventListener("submit", async (event) => {
                    event.preventDefault();
                    const username = new window.FormData(event.currentTarget)
                        .get("username")
                        .trim();
                    const results = await cloud.searchUsers(username);
                    const result = drawer.querySelector("[data-admin-result]");
                    result.replaceChildren();
                    results.slice(0, 5).forEach((user) => {
                        const select = make(
                            "button",
                            "admin-user-result",
                            `@${user.username} — GRANT ADMIN`,
                        );
                        select.type = "button";
                        select.addEventListener("click", async () => {
                            await cloud.grantAdmin(user.username);
                            setFeedback(`@${user.username} can now use Admin.`);
                            result.replaceChildren();
                            await renderAdmins(list, owner);
                        });
                        result.append(select);
                    });
                    if (!results.length)
                        result.append(
                            make("p", "admin-muted", "No matching users."),
                        );
                });
        }
    }

    async function refreshAdminAccess() {
        if (!cloud.currentUser()) return;
        try {
            if (!(await cloud.isAdmin())) {
                document.querySelector(".admin-edge-tab")?.remove();
                document.querySelector(".admin-drawer")?.remove();
                return;
            }
            if (document.querySelector(".admin-drawer")) return;
            await buildAdminDrawer(await cloud.getMyProfile());
        } catch {
            // Revocation removes the panel on the next access check.
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        void refreshAnnouncements();
        void refreshAdminAccess();
        window.setInterval(refreshAnnouncements, 5_000);
        window.setInterval(refreshAdminAccess, 5_000);
    });
})();
