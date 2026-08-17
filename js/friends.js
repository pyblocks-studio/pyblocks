"use strict";

(() => {
    const cloud = window.PyBlocksCloud;
    const status = document.getElementById("friends-status");
    let relationships = { accepted: [], incoming: [], outgoing: [] };

    function make(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function relationFor(userId) {
        for (const type of ["accepted", "incoming", "outgoing"]) {
            const row = relationships[type].find(
                (item) => item.profile?.user_id === userId,
            );
            if (row) return { type, row };
        }
        return null;
    }

    function personCard(profile, actionText, action) {
        const card = make("article", "friend-card");
        const identity = make("a", "friend-identity");
        identity.href = `profile.html?user=${encodeURIComponent(profile.username)}`;
        const avatar = make("span", "friend-avatar");
        if (profile.avatar_path) {
            const image = document.createElement("img");
            image.src = cloud.avatarUrl(profile.avatar_path);
            image.alt = "";
            avatar.append(image);
        }
        const names = make("span", "friend-names");
        names.append(
            make("strong", "", profile.display_name || profile.username),
            make("small", "", `@${profile.username}`),
        );
        identity.append(avatar, names);
        card.append(identity);
        if (actionText) {
            const button = make(
                "button",
                "compact-action secondary",
                actionText,
            );
            button.type = "button";
            button.addEventListener("click", async () => {
                button.disabled = true;
                try {
                    await action();
                    await refresh();
                } catch (error) {
                    status.textContent = error.message;
                    button.disabled = false;
                }
            });
            card.append(button);
        }
        return card;
    }

    async function refresh() {
        if (!cloud.currentUser()) {
            window.location.href = "index.html";
            return;
        }
        relationships = await cloud.listFriends();
        const requests = document.getElementById("friend-requests");
        const friends = document.getElementById("friends-list");
        requests.replaceChildren();
        relationships.incoming.forEach((item) =>
            requests.append(
                personCard(item.profile, "Accept", () =>
                    cloud.acceptFriendRequest(item.id),
                ),
            ),
        );
        relationships.outgoing.forEach((item) =>
            requests.append(
                personCard(item.profile, "Pending", async () => {}),
            ),
        );
        requests.querySelectorAll("button").forEach((button) => {
            if (button.textContent === "Pending") button.disabled = true;
        });
        if (!requests.children.length)
            requests.append(make("p", "text-muted", "No pending requests."));
        friends.replaceChildren();
        relationships.accepted.forEach((item) =>
            friends.append(personCard(item.profile)),
        );
        if (!friends.children.length)
            friends.append(
                make("p", "text-muted", "You have not added any friends yet."),
            );
    }

    document
        .getElementById("friends-search")
        .addEventListener("submit", async (event) => {
            event.preventDefault();
            const query = document.getElementById("friends-query").value.trim();
            const results = document.getElementById("friends-results");
            status.textContent = "Searching…";
            try {
                const users = (await cloud.searchUsers(query)).filter(
                    (profile) => profile.user_id !== cloud.currentUser().id,
                );
                results.replaceChildren();
                users.forEach((profile) => {
                    const relation = relationFor(profile.user_id);
                    let label = "Add friend";
                    let action = () =>
                        cloud.sendFriendRequest(profile.username);
                    if (relation?.type === "incoming") {
                        label = "Accept";
                        action = () =>
                            cloud.acceptFriendRequest(relation.row.id);
                    } else if (relation?.type === "outgoing") label = "Pending";
                    else if (relation?.type === "accepted") label = "Friends";
                    const card = personCard(profile, label, action);
                    if (label === "Pending" || label === "Friends")
                        card.querySelector("button").disabled = true;
                    results.append(card);
                });
                if (!users.length)
                    results.append(
                        make("p", "text-muted", "No matching users."),
                    );
                status.textContent = `${users.length} result${users.length === 1 ? "" : "s"}`;
            } catch (error) {
                status.textContent = error.message;
            }
        });

    document.addEventListener("pyblocks:realtime", (event) => {
        if (event.detail.table === "pyblocks_friendships") void refresh();
    });
    void refresh();
})();
