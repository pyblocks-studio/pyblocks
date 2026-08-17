"use strict";

(() => {
    const cloud = window.PyBlocksCloud;
    const config = window.PyBlocksCloudConfig;
    if (!cloud?.configured() || !window.supabase) return;

    const COLORS = ["#7aa2f7", "#f7768e", "#9ece6a", "#e0af68"];
    let client = null;
    let channel = null;
    let lobby = null;
    let profile = null;
    let applyingRemote = false;
    let workspaceTimer = 0;
    let cursorTimer = 0;
    let heartbeatTimer = 0;
    let lastCursor = null;
    const cursorNodes = new Map();
    const renderedChatIds = new Set();
    let acceptedFriends = [];

    function make(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function status(message) {
        const node = document.getElementById("live-edit-status");
        if (node) node.textContent = message;
    }

    function ensureUi() {
        if (document.getElementById("live-edit-btn")) return;
        const button = make(
            "button",
            "btn btn-secondary live-edit-btn",
            "Live Edit",
        );
        button.id = "live-edit-btn";
        button.type = "button";
        document.querySelector(".actions")?.prepend(button);

        const drawer = make("aside", "live-edit-drawer");
        drawer.id = "live-edit-drawer";
        drawer.hidden = true;
        drawer.innerHTML = `
            <header><div><small>PYBLOCKS</small><h2>Live Edit</h2></div><button type="button" data-live-close aria-label="Close Live Edit">×</button></header>
            <p id="live-edit-status" role="status">Start a lobby to code with up to three friends.</p>
            <div class="live-edit-actions"><button class="btn btn-primary" type="button" data-live-start>Start lobby</button><button class="btn btn-secondary" type="button" data-live-leave hidden>Leave lobby</button><button class="btn btn-danger" type="button" data-live-end hidden>End room</button></div>
            <section><h3>Editors <span data-live-count>0/4</span></h3><div data-live-members class="live-member-list"><p class="text-muted">No active lobby.</p></div></section>
            <details class="live-chat-panel" data-live-chat><summary>Room Chat</summary><div class="live-chat-messages" data-live-chat-messages><p class="text-muted">Start or join a lobby to chat.</p></div><form data-live-chat-form><input name="message" maxlength="1000" autocomplete="off" placeholder="Message the room" aria-label="Message the room"><button type="submit">Send</button></form></details>
            <section><h3>Invite friends</h3><input data-friend-filter maxlength="40" placeholder="Search your friends…" aria-label="Search your friends"><div data-friend-list class="live-friend-list"></div><a class="live-manage-friends" href="friends.html">Manage friends →</a></section>`;
        document.body.append(drawer);

        button.addEventListener("click", async () => {
            drawer.hidden = !drawer.hidden;
            if (!drawer.hidden) await refreshFriends();
        });
        drawer
            .querySelector("[data-live-close]")
            .addEventListener("click", () => {
                drawer.hidden = true;
            });
        drawer
            .querySelector("[data-live-start]")
            .addEventListener("click", () => void startLobby());
        drawer
            .querySelector("[data-live-leave]")
            .addEventListener("click", () => void leaveLobby());
        drawer
            .querySelector("[data-live-end]")
            .addEventListener("click", () => void endLobby());
        drawer
            .querySelector("[data-live-chat-form]")
            .addEventListener("submit", (event) => void sendChat(event));
        drawer
            .querySelector("[data-friend-filter]")
            .addEventListener("input", renderFriendInvites);
    }

    function renderFriendInvites() {
        const list = document.querySelector("[data-friend-list]");
        const query = document
            .querySelector("[data-friend-filter]")
            ?.value.trim()
            .toLowerCase();
        if (!list) return;
        const visible = acceptedFriends.filter((friend) => {
            const username = friend.profile?.username?.toLowerCase() || "";
            const displayName =
                friend.profile?.display_name?.toLowerCase() || "";
            return (
                !query ||
                username.includes(query) ||
                displayName.includes(query)
            );
        });
        list.replaceChildren();
        if (!visible.length) {
            list.append(
                make(
                    "p",
                    "text-muted",
                    acceptedFriends.length
                        ? "No friends match that search."
                        : "No friends yet. Add people from the Friends page.",
                ),
            );
            return;
        }
        visible.forEach((friend) => {
            const row = make("div", "live-friend-row");
            row.append(
                make(
                    "span",
                    "",
                    friend.profile?.display_name ||
                        `@${friend.profile?.username || "friend"}`,
                ),
            );
            const invite = make("button", "", "Invite");
            invite.type = "button";
            invite.disabled = !lobby;
            invite.addEventListener("click", async () => {
                try {
                    await cloud.inviteFriendToLobby(
                        lobby.id,
                        friend.profile.user_id,
                    );
                    invite.textContent = "Invited";
                    invite.disabled = true;
                } catch (error) {
                    status(error.message);
                }
            });
            row.append(invite);
            list.append(row);
        });
    }

    async function refreshFriends() {
        const list = document.querySelector("[data-friend-list]");
        if (!list) return;
        if (!cloud.currentUser()) {
            list.replaceChildren(
                make("p", "text-muted", "Sign in to use Live Edit."),
            );
            return;
        }
        try {
            const friends = await cloud.listFriends();
            acceptedFriends = friends.accepted;
            renderFriendInvites();
        } catch (error) {
            status(error.message);
        }
    }

    async function startLobby() {
        if (!cloud.currentUser())
            return status("Sign in before starting Live Edit.");
        let projectId = window.PyBlocksCloudController?.getCurrentProjectId();
        if (!projectId) {
            status("Saving this project to the cloud first…");
            await window.PyBlocksCloudController.saveCurrentProject();
            projectId = window.PyBlocksCloudController.getCurrentProjectId();
        }
        if (!projectId)
            return status(
                "Save the project to the cloud before starting a lobby.",
            );
        try {
            lobby = await cloud.createLiveLobby(projectId);
            await connectLobby();
            await refreshFriends();
        } catch (error) {
            status(error.message);
        }
    }

    async function joinLobby(lobbyId) {
        try {
            lobby = await cloud.getLiveLobby(lobbyId);
            if (!lobby?.is_open)
                throw new Error("This Live Edit lobby is closed.");
            const project = await cloud.loadProject(lobby.project_id);
            window.PythonEngine.loadProject(project, { saved: true });
            await connectLobby();
        } catch (error) {
            status(error.message);
        }
    }

    async function connectLobby() {
        const token = await cloud.getAccessToken();
        profile = await cloud.getMyProfile();
        client ||= window.supabase.createClient(
            config.supabaseUrl,
            config.publishableKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false,
                },
            },
        );
        await client.realtime.setAuth(token);
        if (channel) await client.removeChannel(channel);
        channel = client.channel(`pyblocks-live:${lobby.id}`, {
            config: {
                private: true,
                broadcast: { self: false, ack: false },
                presence: { key: cloud.currentUser().id },
            },
        });
        channel
            .on("presence", { event: "sync" }, renderMembers)
            .on("broadcast", { event: "cursor" }, ({ payload }) =>
                renderCursor(payload),
            )
            .on("broadcast", { event: "workspace" }, ({ payload }) =>
                applyWorkspace(payload),
            )
            .on("broadcast", { event: "sync-request" }, () =>
                broadcastWorkspace(),
            )
            .on("broadcast", { event: "chat" }, ({ payload }) =>
                renderChatMessage(payload),
            )
            .on(
                "broadcast",
                { event: "room-ended" },
                () =>
                    void disconnectLobby("The host ended this Live Edit room."),
            );
        channel.subscribe(async (subscriptionStatus) => {
            if (subscriptionStatus !== "SUBSCRIBED") return;
            await channel.track({
                userId: cloud.currentUser().id,
                username: profile.username,
                displayName: profile.display_name,
                color: COLORS[Math.abs(hash(profile.username)) % COLORS.length],
            });
            status("Live Edit connected.");
            document.body.classList.add("live-edit-active");
            document.querySelector("[data-live-start]").hidden = true;
            document.querySelector("[data-live-leave]").hidden = false;
            document.querySelector("[data-live-end]").hidden =
                lobby.owner_id !== cloud.currentUser().id;
            await channel.send({
                type: "broadcast",
                event: "sync-request",
                payload: {},
            });
            window.clearInterval(heartbeatTimer);
            heartbeatTimer = window.setInterval(
                () => void cloud.touchLiveLobby(lobby.id),
                30_000,
            );
        });
        window.PyBlocksWorkspace.addChangeListener(queueWorkspace);
        document.addEventListener("pointermove", queueCursor);
        await renderMembers();
        await loadChat();
    }

    async function loadChat() {
        const messages = document.querySelector("[data-live-chat-messages]");
        if (!messages || !lobby) return;
        messages.replaceChildren();
        const history = await cloud.listLiveChatMessages(lobby.id);
        if (!history.length)
            messages.append(
                make("p", "text-muted", "No messages yet. Say hello!"),
            );
        history.forEach(renderChatMessage);
        messages.scrollTop = messages.scrollHeight;
    }

    function renderChatMessage(message) {
        if (!message?.id || renderedChatIds.has(message.id)) return;
        renderedChatIds.add(message.id);
        const messages = document.querySelector("[data-live-chat-messages]");
        if (!messages) return;
        messages.querySelector(".text-muted")?.remove();
        const mine = message.sender_id === cloud.currentUser()?.id;
        const bubble = make(
            "article",
            `live-chat-message ${mine ? "is-mine" : "is-theirs"}`,
        );
        const sender = message.sender || {};
        const avatar = document.createElement("img");
        avatar.alt = "";
        avatar.src =
            message.avatar ||
            cloud.avatarUrl(sender) ||
            "assets/images/brand-icons/favicon.svg";
        const content = make("div", "");
        content.append(
            make(
                "strong",
                "",
                message.displayName ||
                    sender.display_name ||
                    sender.username ||
                    "PyBlocks friend",
            ),
            make("p", "", message.body),
        );
        bubble.append(avatar, content);
        messages.append(bubble);
        messages.scrollTop = messages.scrollHeight;
    }

    async function sendChat(event) {
        event.preventDefault();
        if (!lobby || !channel) return status("Join a Live Edit room first.");
        const input = event.currentTarget.elements.message;
        try {
            const saved = await cloud.sendLiveChatMessage(
                lobby.id,
                input.value,
            );
            input.value = "";
            const payload = {
                ...saved,
                sender: profile,
                displayName: profile.display_name || profile.username,
                avatar: cloud.avatarUrl(profile),
            };
            renderChatMessage(payload);
            await channel.send({
                type: "broadcast",
                event: "chat",
                payload,
            });
        } catch (error) {
            status(error.message);
        }
    }

    async function endLobby() {
        if (!lobby || lobby.owner_id !== cloud.currentUser()?.id) return;
        if (!window.confirm("End this Live Edit room for everyone?")) return;
        await cloud.endLiveLobby(lobby.id);
        await channel.send({
            type: "broadcast",
            event: "room-ended",
            payload: { endedBy: cloud.currentUser().id },
        });
        await disconnectLobby("You ended the Live Edit room.");
    }

    function hash(value) {
        return [...String(value)].reduce(
            (total, character) => total + character.charCodeAt(0),
            0,
        );
    }

    function queueWorkspace(event) {
        if (!channel || applyingRemote || event?.isUiEvent) return;
        window.clearTimeout(workspaceTimer);
        workspaceTimer = window.setTimeout(broadcastWorkspace, 180);
    }

    async function broadcastWorkspace() {
        if (!channel) return;
        await channel.send({
            type: "broadcast",
            event: "workspace",
            payload: {
                sender: cloud.currentUser().id,
                workspace: Blockly.serialization.workspaces.save(
                    window.PyBlocksWorkspace,
                ),
                sentAt: Date.now(),
            },
        });
    }

    function applyWorkspace(payload) {
        if (!payload?.workspace || payload.sender === cloud.currentUser()?.id)
            return;
        applyingRemote = true;
        Blockly.Events.disable();
        try {
            window.PyBlocksWorkspace.clear();
            Blockly.serialization.workspaces.load(
                payload.workspace,
                window.PyBlocksWorkspace,
            );
        } finally {
            Blockly.Events.enable();
            applyingRemote = false;
        }
        window.PythonEngine.updatePreview();
        window.PythonEngine.updateSaveStatus("Live changes");
    }

    function queueCursor(event) {
        if (!channel) return;
        const workspace = document.querySelector(".workspace-panel");
        if (!workspace?.contains(event.target)) return;
        lastCursor = {
            x: event.clientX / window.innerWidth,
            y: event.clientY / window.innerHeight,
        };
        if (cursorTimer) return;
        cursorTimer = window.setTimeout(async () => {
            cursorTimer = 0;
            await channel.send({
                type: "broadcast",
                event: "cursor",
                payload: {
                    ...lastCursor,
                    userId: cloud.currentUser().id,
                    name: profile.display_name || profile.username,
                    color: COLORS[
                        Math.abs(hash(profile.username)) % COLORS.length
                    ],
                },
            });
        }, 50);
    }

    function renderCursor(payload) {
        if (!payload?.userId || payload.userId === cloud.currentUser()?.id)
            return;
        let cursor = cursorNodes.get(payload.userId);
        if (!cursor) {
            cursor = make("div", "live-remote-cursor");
            cursor.innerHTML = `<i></i><span></span>`;
            document.body.append(cursor);
            cursorNodes.set(payload.userId, cursor);
        }
        cursor.style.left = `${payload.x * window.innerWidth}px`;
        cursor.style.top = `${payload.y * window.innerHeight}px`;
        cursor.style.setProperty("--cursor-color", payload.color);
        cursor.querySelector("span").textContent = payload.name;
    }

    async function renderMembers() {
        if (!channel) return;
        const presences = Object.values(channel.presenceState()).flat();
        const list = document.querySelector("[data-live-members]");
        const count = document.querySelector("[data-live-count]");
        if (!list || !count) return;
        count.textContent = `${presences.length}/4`;
        list.replaceChildren();
        presences.forEach((member) => {
            const row = make("div", "live-member-row");
            const dot = make("i", "");
            dot.style.background = member.color;
            row.append(
                dot,
                make("span", "", member.displayName || member.username),
            );
            list.append(row);
        });
    }

    async function leaveLobby() {
        await disconnectLobby("You left the Live Edit lobby.");
    }

    async function disconnectLobby(message) {
        if (!lobby) return;
        window.PyBlocksWorkspace.removeChangeListener(queueWorkspace);
        window.clearInterval(heartbeatTimer);
        document.removeEventListener("pointermove", queueCursor);
        if (channel) {
            await channel.untrack();
            await client.removeChannel(channel);
        }
        await cloud.leaveLiveLobby(lobby.id);
        channel = null;
        lobby = null;
        cursorNodes.forEach((node) => node.remove());
        cursorNodes.clear();
        document.body.classList.remove("live-edit-active");
        document.querySelector("[data-live-start]").hidden = false;
        document.querySelector("[data-live-leave]").hidden = true;
        document.querySelector("[data-live-end]").hidden = true;
        document
            .querySelector("[data-live-chat-messages]")
            ?.replaceChildren(
                make("p", "text-muted", "Start or join a lobby to chat."),
            );
        renderedChatIds.clear();
        status(message);
        await refreshFriends();
    }

    document.addEventListener("DOMContentLoaded", () => {
        ensureUi();
        const lobbyId = new window.URLSearchParams(window.location.search).get(
            "live",
        );
        if (lobbyId && cloud.currentUser()) void joinLobby(lobbyId);
    });
    window.addEventListener("beforeunload", () => {
        if (channel) void channel.untrack();
    });
})();
