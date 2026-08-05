"use strict";

window.PyBlocksCloud = (() => {
    const SESSION_KEY = "pyblocks-cloud-session-v1";
    const PROFILE_FIELDS =
        "user_id,username,display_name,avatar_path,role,rank_tag,active_seconds,joined_at,updated_at,equipped_banner_id";
    const AVATAR_BUCKET = "pyblocks-avatars";
    const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
    const REMIX_FIELDS =
        "remixed_from_project_id,remixed_from_name,remixed_from_username";
    const config = window.PyBlocksCloudConfig || {};
    let session = readSession();

    function configured() {
        return Boolean(config.supabaseUrl && config.publishableKey);
    }

    function requireConfiguration() {
        if (!configured())
            throw new Error(
                "Cloud saving is not connected yet. Add the Supabase project URL and public key to js/cloud-config.js.",
            );
    }

    function readSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
        } catch {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
    }

    function saveSession(value) {
        session = value;
        if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
        else localStorage.removeItem(SESSION_KEY);
        document.dispatchEvent(
            new CustomEvent("pyblocks:cloud-session", {
                detail: currentUser(),
            }),
        );
    }

    async function refreshSessionIfNeeded() {
        if (
            !session?.refresh_token ||
            !session?.expires_at ||
            session.expires_at * 1000 - Date.now() > 60_000
        )
            return;
        const response = await fetch(
            `${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
            {
                method: "POST",
                headers: {
                    apikey: config.publishableKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ refresh_token: session.refresh_token }),
            },
        );
        if (!response.ok) {
            saveSession(null);
            throw new Error("Your session expired. Please sign in again.");
        }
        saveSession(await response.json());
    }

    async function request(path, options = {}, authenticated = false) {
        requireConfiguration();
        const headers = new Headers(options.headers || {});
        headers.set("apikey", config.publishableKey);
        if (authenticated) {
            await refreshSessionIfNeeded();
            if (!session?.access_token)
                throw new Error("Sign in to use cloud projects.");
            headers.set("Authorization", `Bearer ${session.access_token}`);
        }
        if (
            typeof options.body === "string" &&
            options.body &&
            !headers.has("Content-Type")
        )
            headers.set("Content-Type", "application/json");
        const response = await fetch(`${config.supabaseUrl}${path}`, {
            ...options,
            headers,
        });
        const text = await response.text();
        let body = null;
        if (text) {
            try {
                body = JSON.parse(text);
            } catch {
                body = text;
            }
        }
        if (!response.ok) {
            if (response.status === 401) saveSession(null);
            throw new Error(
                body?.msg ||
                    body?.message ||
                    body?.error_description ||
                    `Cloud request failed (${response.status}).`,
            );
        }
        return body;
    }

    function currentUser() {
        if (!session?.user) return null;
        return {
            id: session.user.id,
            email: session.user.email,
            username:
                session.user.user_metadata?.username ||
                session.user.email?.split("@")[0] ||
                "PyBlocks user",
        };
    }

    async function signUp({ username, email, password }) {
        const body = await request("/auth/v1/signup", {
            method: "POST",
            body: JSON.stringify({
                email,
                password,
                data: { username },
            }),
        });
        if (body.access_token) saveSession(body);
        return {
            signedIn: Boolean(body.access_token),
            message: body.access_token
                ? "Account created."
                : "Account created. Check your email to confirm it, then sign in.",
        };
    }

    async function signIn({ email, password }) {
        const body = await request("/auth/v1/token?grant_type=password", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
        saveSession(body);
        return currentUser();
    }

    async function ensureProfile() {
        const user = currentUser();
        if (!user) throw new Error("Sign in to continue.");
        const existing = await request(
            `/rest/v1/pyblocks_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=${PROFILE_FIELDS}`,
            { method: "GET" },
            true,
        );
        if (existing?.length) return existing[0];
        const rows = await request(
            "/rest/v1/pyblocks_profiles",
            {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    user_id: user.id,
                    username: user.username
                        .replace(/[^A-Za-z0-9_]/g, "_")
                        .slice(0, 32),
                    display_name: user.username.slice(0, 40),
                }),
            },
            true,
        );
        return rows?.[0] || null;
    }

    async function getMyProfile() {
        return ensureProfile();
    }

    async function getProfileByUsername(username) {
        const rows = await request(
            `/rest/v1/pyblocks_profiles?username=ilike.${encodeURIComponent(username)}&select=${PROFILE_FIELDS}&limit=1`,
            { method: "GET" },
        );
        return rows?.[0] || null;
    }

    function avatarUrl(profile) {
        if (!profile?.avatar_path) return "";
        return `${config.supabaseUrl}/storage/v1/object/public/${AVATAR_BUCKET}/${profile.avatar_path}`;
    }

    async function updateProfile(displayName) {
        const name = String(displayName || "")
            .trim()
            .slice(0, 40);
        if (!name) throw new Error("Display name cannot be empty.");
        const user = currentUser();
        if (!user) throw new Error("Sign in to update your profile.");
        const rows = await request(
            `/rest/v1/pyblocks_profiles?user_id=eq.${encodeURIComponent(user.id)}`,
            {
                method: "PATCH",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    display_name: name,
                    updated_at: new Date().toISOString(),
                }),
            },
            true,
        );
        return rows?.[0] || null;
    }

    async function uploadAvatar(file) {
        const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
        if (!file || !allowedTypes.has(file.type))
            throw new Error("Choose a PNG, JPEG, or WebP image.");
        if (file.size > MAX_AVATAR_BYTES)
            throw new Error("Profile pictures must be 2 MB or smaller.");
        const user = currentUser();
        if (!user) throw new Error("Sign in to upload a profile picture.");
        const avatarPath = `${user.id}/avatar`;
        await request(
            `/storage/v1/object/${AVATAR_BUCKET}/${avatarPath}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": file.type,
                    "x-upsert": "true",
                    "cache-control": "3600",
                },
                body: file,
            },
            true,
        );
        const rows = await request(
            `/rest/v1/pyblocks_profiles?user_id=eq.${encodeURIComponent(user.id)}`,
            {
                method: "PATCH",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    avatar_path: avatarPath,
                    updated_at: new Date().toISOString(),
                }),
            },
            true,
        );
        return rows?.[0] || null;
    }

    async function signOut() {
        if (session?.access_token) {
            try {
                await request("/auth/v1/logout", { method: "POST" }, true);
            } catch {
                // Local sign-out still succeeds if the network is unavailable.
            }
        }
        saveSession(null);
    }

    function bytesToBase64(bytes) {
        let binary = "";
        for (let offset = 0; offset < bytes.length; offset += 0x8000)
            binary += String.fromCharCode(
                ...bytes.subarray(offset, offset + 0x8000),
            );
        return btoa(binary);
    }

    function base64ToBytes(value) {
        const binary = atob(value);
        return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    }

    async function compress(text) {
        const source = new TextEncoder().encode(text);
        if (!("CompressionStream" in window))
            return {
                payload: bytesToBase64(source),
                encoding: "base64",
                uncompressedBytes: source.length,
            };
        const stream = new Blob([source])
            .stream()
            .pipeThrough(new CompressionStream("gzip"));
        const compressed = new Uint8Array(
            await new Response(stream).arrayBuffer(),
        );
        return {
            payload: bytesToBase64(compressed),
            encoding: "gzip-base64",
            uncompressedBytes: source.length,
        };
    }

    async function decompress(payload, encoding) {
        const bytes = base64ToBytes(payload);
        if (encoding === "base64") return new TextDecoder().decode(bytes);
        if (encoding !== "gzip-base64" || !("DecompressionStream" in window))
            throw new Error(
                "This browser cannot decompress the cloud project.",
            );
        const stream = new Blob([bytes])
            .stream()
            .pipeThrough(new DecompressionStream("gzip"));
        return new Response(stream).text();
    }

    async function listProjects() {
        return request(
            `/rest/v1/pyblocks_projects?select=id,name,description,is_published,published_at,updated_at,uncompressed_bytes,${REMIX_FIELDS}&order=updated_at.desc`,
            { method: "GET" },
            true,
        );
    }

    async function saveProject(project, options = {}) {
        const text = JSON.stringify(project);
        const packed = await compress(text);
        const published = Boolean(options.isPublished);
        const record = {
            user_id: currentUser().id,
            name: project.name,
            description: String(options.description || "").slice(0, 500),
            payload: packed.payload,
            encoding: packed.encoding,
            uncompressed_bytes: packed.uncompressedBytes,
            is_published: published,
            published_at: published ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
            remixed_from_project_id:
                options.remixAttribution?.projectId || null,
            remixed_from_name: options.remixAttribution?.projectName || null,
            remixed_from_username: options.remixAttribution?.username || null,
        };
        if (options.id) {
            const rows = await request(
                `/rest/v1/pyblocks_projects?id=eq.${encodeURIComponent(options.id)}`,
                {
                    method: "PATCH",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify(record),
                },
                true,
            );
            return rows?.[0] || null;
        }
        const rows = await request(
            "/rest/v1/pyblocks_projects?on_conflict=user_id,name",
            {
                method: "POST",
                headers: {
                    Prefer: "resolution=merge-duplicates,return=representation",
                },
                body: JSON.stringify(record),
            },
            true,
        );
        return rows?.[0] || null;
    }

    async function loadProject(id) {
        const rows = await request(
            `/rest/v1/pyblocks_projects?id=eq.${encodeURIComponent(id)}&select=payload,encoding`,
            { method: "GET" },
            true,
        );
        if (!rows?.length) throw new Error("Cloud project was not found.");
        return window.PyBlocksProjectFormat.parse(
            await decompress(rows[0].payload, rows[0].encoding),
        );
    }

    async function deleteProject(id) {
        await request(
            `/rest/v1/pyblocks_projects?id=eq.${encodeURIComponent(id)}`,
            { method: "DELETE" },
            true,
        );
    }

    async function updateProjectMetadata(id, changes) {
        const rows = await request(
            `/rest/v1/pyblocks_projects?id=eq.${encodeURIComponent(id)}`,
            {
                method: "PATCH",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    name: String(changes.name || "Untitled").slice(0, 120),
                    description: String(changes.description || "").slice(
                        0,
                        500,
                    ),
                    is_published: Boolean(changes.isPublished),
                    published_at: changes.isPublished
                        ? new Date().toISOString()
                        : null,
                    updated_at: new Date().toISOString(),
                }),
            },
            true,
        );
        return rows?.[0] || null;
    }

    async function getProfiles(userIds) {
        const ids = [...new Set(userIds)].filter(Boolean);
        if (!ids.length) return [];
        return request(
            `/rest/v1/pyblocks_profiles?user_id=in.(${ids.join(",")})&select=${PROFILE_FIELDS}`,
            { method: "GET" },
        );
    }

    async function listPublishedProjects(limit = 20) {
        return request(
            `/rest/v1/pyblocks_projects?is_published=eq.true&select=id,user_id,name,description,published_at,updated_at,${REMIX_FIELDS}&order=updated_at.desc&limit=${Math.min(60, Math.max(1, limit))}`,
            { method: "GET" },
        );
    }

    async function listPublishedByUser(userId) {
        return request(
            `/rest/v1/pyblocks_projects?user_id=eq.${encodeURIComponent(userId)}&is_published=eq.true&select=id,user_id,name,description,published_at,updated_at,${REMIX_FIELDS}&order=updated_at.desc`,
            { method: "GET" },
        );
    }

    async function loadPublishedProject(id) {
        const rows = await request(
            `/rest/v1/pyblocks_projects?id=eq.${encodeURIComponent(id)}&is_published=eq.true&select=id,user_id,name,description,payload,encoding,published_at,updated_at,${REMIX_FIELDS}&limit=1`,
            { method: "GET" },
        );
        if (!rows?.length) throw new Error("Published project was not found.");
        const row = rows[0];
        return {
            ...row,
            project: window.PyBlocksProjectFormat.parse(
                await decompress(row.payload, row.encoding),
            ),
        };
    }

    async function searchProjects(query) {
        const pattern = `*${String(query).replace(/[%*,()]/g, "")}*`;
        return request(
            `/rest/v1/pyblocks_projects?is_published=eq.true&name=ilike.${encodeURIComponent(pattern)}&select=id,user_id,name,description,published_at,updated_at,${REMIX_FIELDS}&order=updated_at.desc&limit=30`,
            { method: "GET" },
        );
    }

    async function searchUsers(query) {
        const pattern = `*${String(query).replace(/[%*,()]/g, "")}*`;
        return request(
            `/rest/v1/pyblocks_profiles?username=ilike.${encodeURIComponent(pattern)}&select=${PROFILE_FIELDS}&order=username.asc&limit=30`,
            { method: "GET" },
        );
    }

    async function recordActivity(seconds) {
        if (!currentUser()) return;
        await request(
            "/rest/v1/rpc/record_pyblocks_activity",
            {
                method: "POST",
                body: JSON.stringify({ seconds }),
            },
            true,
        );
    }

    async function listBanners() {
        return request(
            "/rest/v1/pyblocks_banners?select=id,name,description,sort_order,is_public,grant_level&order=sort_order.asc",
            { method: "GET" },
        );
    }

    async function getUserBanners(userId) {
        return request(
            `/rest/v1/pyblocks_user_banners?user_id=eq.${encodeURIComponent(userId)}&select=banner_id,granted_at`,
            { method: "GET" },
        );
    }

    async function equipBanner(bannerId) {
        const user = currentUser();
        if (!user) throw new Error("Sign in to equip a banner.");
        const rows = await request(
            `/rest/v1/pyblocks_profiles?user_id=eq.${encodeURIComponent(user.id)}`,
            {
                method: "PATCH",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    equipped_banner_id: bannerId,
                    updated_at: new Date().toISOString(),
                }),
            },
            true,
        );
        return rows?.[0] || null;
    }

    async function listAchievements() {
        return request(
            "/rest/v1/pyblocks_achievements?select=id,name,description,reward_banner_id,sort_order&order=sort_order.asc",
            { method: "GET" },
        );
    }

    async function getUserAchievements(userId) {
        return request(
            `/rest/v1/pyblocks_user_achievements?user_id=eq.${encodeURIComponent(userId)}&select=achievement_id,earned_at`,
            { method: "GET" },
        );
    }

    async function isAdmin() {
        if (!currentUser()) return false;
        return request(
            "/rest/v1/rpc/pyblocks_is_admin",
            { method: "POST", body: "{}" },
            true,
        );
    }

    async function listAdmins() {
        const rows = await request(
            "/rest/v1/pyblocks_admins?select=user_id,granted_at&order=granted_at.asc",
            { method: "GET" },
            true,
        );
        const profiles = await getProfiles(rows.map((row) => row.user_id));
        const profileMap = new Map(
            profiles.map((profile) => [profile.user_id, profile]),
        );
        return rows.map((row) => ({
            ...row,
            profile: profileMap.get(row.user_id),
        }));
    }

    async function rpc(name, body) {
        return request(
            `/rest/v1/rpc/${name}`,
            { method: "POST", body: JSON.stringify(body || {}) },
            true,
        );
    }

    function grantAdmin(username) {
        return rpc("pyblocks_grant_admin", { target_username: username });
    }

    function revokeAdmin(userId) {
        return rpc("pyblocks_revoke_admin", { target_id: userId });
    }

    function grantBanner(username, bannerId, audience = "user") {
        return rpc("pyblocks_grant_banner", {
            target_username: username,
            target_banner: bannerId,
            audience,
        });
    }

    function revokeBanner(username, bannerId) {
        return rpc("pyblocks_revoke_banner", {
            target_username: username,
            target_banner: bannerId,
        });
    }

    function grantAllBanners(username) {
        return rpc("pyblocks_grant_all_banners", {
            target_username: username,
        });
    }

    function revokeAllBanners(username) {
        return rpc("pyblocks_revoke_all_banners", {
            target_username: username,
        });
    }

    function giveAdminGift(username) {
        return rpc("pyblocks_give_admin_gift", {
            target_username: username,
        });
    }

    function setRankTag(username, rankTag) {
        return rpc("pyblocks_set_rank_tag", {
            target_username: username,
            new_rank_tag: rankTag,
        });
    }

    async function publishAnnouncement(message) {
        const user = currentUser();
        if (!user) throw new Error("Sign in to announce.");
        await request(
            "/rest/v1/pyblocks_announcements",
            {
                method: "POST",
                body: JSON.stringify({
                    message: String(message).trim().slice(0, 500),
                    author_id: user.id,
                }),
            },
            true,
        );
    }

    async function getActiveAnnouncements() {
        const cutoff = new Date(Date.now() - 30_000).toISOString();
        const rows = await request(
            `/rest/v1/pyblocks_announcements?active=eq.true&created_at=gte.${encodeURIComponent(cutoff)}&select=id,message,author_id,created_at&order=created_at.asc&limit=20`,
            { method: "GET" },
        );
        if (!rows?.length) return [];
        const profiles = await getProfiles([
            ...new Set(rows.map((row) => row.author_id)),
        ]);
        const profileMap = new Map(
            profiles.map((profile) => [profile.user_id, profile]),
        );
        return rows.map((row) => ({
            ...row,
            author: profileMap.get(row.author_id),
        }));
    }

    return {
        configured,
        currentUser,
        signUp,
        signIn,
        signOut,
        ensureProfile,
        getMyProfile,
        getProfileByUsername,
        avatarUrl,
        updateProfile,
        uploadAvatar,
        listProjects,
        saveProject,
        loadProject,
        deleteProject,
        updateProjectMetadata,
        getProfiles,
        listPublishedProjects,
        listPublishedByUser,
        loadPublishedProject,
        searchProjects,
        searchUsers,
        recordActivity,
        listBanners,
        getUserBanners,
        equipBanner,
        listAchievements,
        getUserAchievements,
        isAdmin,
        listAdmins,
        grantAdmin,
        revokeAdmin,
        grantBanner,
        revokeBanner,
        grantAllBanners,
        revokeAllBanners,
        giveAdminGift,
        setRankTag,
        publishAnnouncement,
        getActiveAnnouncements,
        compress,
        decompress,
    };
})();
