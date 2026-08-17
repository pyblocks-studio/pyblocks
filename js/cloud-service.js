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
            const error = new Error(
                body?.msg ||
                    body?.message ||
                    body?.error_description ||
                    `Cloud request failed (${response.status}).`,
            );
            error.code = body?.code || "";
            error.status = response.status;
            throw error;
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

    async function getAccessToken() {
        await refreshSessionIfNeeded();
        return session?.access_token || null;
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

    async function accountAccess(payload) {
        return request("/functions/v1/account-access", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }

    async function signIn({ identifier, password }) {
        const normalizedIdentifier = String(identifier || "").trim();
        const body = normalizedIdentifier.includes("@")
            ? await request("/auth/v1/token?grant_type=password", {
                  method: "POST",
                  body: JSON.stringify({
                      email: normalizedIdentifier.toLowerCase(),
                      password,
                  }),
              })
            : await accountAccess({
                  action: "signin",
                  identifier: normalizedIdentifier,
                  password,
              });
        saveSession(body);
        return currentUser();
    }

    async function requestPasswordReset(identifier) {
        await accountAccess({
            action: "recover",
            identifier,
            origin: window.location.origin,
        });
        return "If an account matches that username or email, a reset link is on its way. If you did not request it, you can safely ignore the email.";
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
        const allowedTypes = new Set([
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/svg+xml",
        ]);
        if (!file || !allowedTypes.has(file.type))
            throw new Error("Choose a PNG, JPEG, WebP, or SVG image.");
        if (file.size > MAX_AVATAR_BYTES)
            throw new Error("Profile pictures must be 2 MB or smaller.");
        let uploadFile = file;
        if (file.type === "image/svg+xml") {
            const source = await file.text();
            if (/<!doctype|<!entity/i.test(source))
                throw new Error("That SVG contains unsupported declarations.");
            const documentNode = new window.DOMParser().parseFromString(
                source,
                "image/svg+xml",
            );
            if (
                documentNode.querySelector("parsererror") ||
                documentNode.documentElement.localName !== "svg"
            )
                throw new Error("That SVG could not be read safely.");
            const forbidden = documentNode.querySelector(
                "script, foreignObject, iframe, object, embed, audio, video, animate, animateMotion, animateTransform, set, discard",
            );
            if (forbidden)
                throw new Error(
                    "SVG profile pictures cannot contain scripts or embedded documents.",
                );
            for (const style of documentNode.querySelectorAll("style")) {
                if (
                    /javascript:|@import|expression\s*\(|behavior\s*:|-moz-binding|url\s*\(\s*['"]?(?!#)/i.test(
                        style.textContent || "",
                    )
                )
                    throw new Error(
                        "SVG profile pictures cannot load external styles.",
                    );
            }
            for (const element of documentNode.querySelectorAll("*")) {
                for (const attribute of [...element.attributes]) {
                    const name = attribute.name.toLowerCase();
                    const value = attribute.value.trim();
                    if (name.startsWith("on"))
                        throw new Error(
                            "SVG profile pictures cannot contain event handlers.",
                        );
                    if (
                        (name === "href" || name === "xlink:href") &&
                        value &&
                        !value.startsWith("#")
                    )
                        throw new Error(
                            "SVG profile pictures cannot load external files.",
                        );
                    if (
                        name === "style" &&
                        /javascript:|@import|expression\s*\(|behavior\s*:|-moz-binding|url\s*\(\s*['"]?(?!#)/i.test(
                            value,
                        )
                    )
                        throw new Error(
                            "SVG profile pictures cannot load external styles.",
                        );
                }
            }
            uploadFile = new window.Blob(
                [new window.XMLSerializer().serializeToString(documentNode)],
                { type: "image/svg+xml" },
            );
            if (uploadFile.size > MAX_AVATAR_BYTES)
                throw new Error("Profile pictures must be 2 MB or smaller.");
        }
        const user = currentUser();
        if (!user) throw new Error("Sign in to upload a profile picture.");
        const avatarPath = `${user.id}/avatar`;
        await request(
            `/storage/v1/object/${AVATAR_BUCKET}/${avatarPath}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": uploadFile.type,
                    "x-upsert": "true",
                    "cache-control": "3600",
                },
                body: uploadFile,
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
        let firstPublishedAt = null;
        const owner = currentUser();
        if (options.id) {
            const existing = await request(
                `/rest/v1/pyblocks_projects?id=eq.${encodeURIComponent(options.id)}&user_id=eq.${encodeURIComponent(owner.id)}&select=published_at&limit=1`,
                { method: "GET" },
                true,
            );
            firstPublishedAt = existing?.[0]?.published_at || null;
        } else {
            const existing = await request(
                `/rest/v1/pyblocks_projects?user_id=eq.${encodeURIComponent(owner.id)}&name=eq.${encodeURIComponent(project.name)}&select=published_at&limit=1`,
                { method: "GET" },
                true,
            );
            firstPublishedAt = existing?.[0]?.published_at || null;
        }
        if (published && !firstPublishedAt)
            firstPublishedAt = new Date().toISOString();
        const record = {
            user_id: owner.id,
            name: project.name,
            description: String(options.description || "").slice(0, 500),
            payload: packed.payload,
            encoding: packed.encoding,
            uncompressed_bytes: packed.uncompressedBytes,
            is_published: published,
            published_at: firstPublishedAt,
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
        const user = currentUser();
        if (!user) throw new Error("Sign in to delete a cloud project.");
        const projectPath = `/rest/v1/pyblocks_projects?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}`;
        const projects = await request(
            `${projectPath}&select=id,is_published`,
            { method: "GET" },
            true,
        );
        if (!projects?.length) throw new Error("Cloud project was not found.");
        if (projects[0].is_published)
            throw new Error("Unpublish this project before deleting it.");
        await request(
            `${projectPath}&is_published=eq.false`,
            { method: "DELETE" },
            true,
        );
    }

    async function updateProjectMetadata(id, changes) {
        const existing = await request(
            `/rest/v1/pyblocks_projects?id=eq.${encodeURIComponent(id)}&select=published_at&limit=1`,
            { method: "GET" },
            true,
        );
        let firstPublishedAt = existing?.[0]?.published_at || null;
        if (changes.isPublished && !firstPublishedAt)
            firstPublishedAt = new Date().toISOString();
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
                    published_at: firstPublishedAt,
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
        const contributorRows = await request(
            `/rest/v1/pyblocks_project_contributors?project_id=eq.${encodeURIComponent(id)}&select=user_id,contributed_at&order=contributed_at.asc`,
            { method: "GET" },
        );
        const contributorProfiles = await getProfiles(
            contributorRows.map((contributor) => contributor.user_id),
        );
        const contributorMap = new Map(
            contributorProfiles.map((contributor) => [
                contributor.user_id,
                contributor,
            ]),
        );
        return {
            ...row,
            contributors: contributorRows
                .map((contributor) => contributorMap.get(contributor.user_id))
                .filter(Boolean),
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
            `/rest/v1/pyblocks_profiles?or=(username.ilike.${encodeURIComponent(pattern)},display_name.ilike.${encodeURIComponent(pattern)})&select=${PROFILE_FIELDS}&order=username.asc&limit=30`,
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

    function grantAchievement(username, achievementId) {
        return rpc("pyblocks_grant_achievement", {
            target_username: username,
            target_achievement: achievementId,
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

    async function listUpdates() {
        return request(
            "/rest/v1/pyblocks_updates?select=id,title,description,version,status,created_at,activated_at&order=created_at.desc&limit=100",
            { method: "GET" },
            Boolean(currentUser()),
        );
    }

    async function queueUpdate({ title, description, version }) {
        const user = currentUser();
        if (!user) throw new Error("Sign in to queue an update.");
        const rows = await request(
            "/rest/v1/pyblocks_updates",
            {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    title: String(title).trim().slice(0, 100),
                    description: String(description || "")
                        .trim()
                        .slice(0, 1000),
                    version: String(version || "")
                        .trim()
                        .slice(0, 40),
                    created_by: user.id,
                }),
            },
            true,
        );
        return rows?.[0] || null;
    }

    async function activateUpdate(id) {
        const rows = await request(
            `/rest/v1/pyblocks_updates?id=eq.${encodeURIComponent(id)}&status=eq.queued`,
            {
                method: "PATCH",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    status: "live",
                    activated_at: new Date().toISOString(),
                }),
            },
            true,
        );
        return rows?.[0] || null;
    }

    async function reloadEveryone() {
        const user = currentUser();
        if (!user) throw new Error("Sign in to reload the site.");
        await request(
            "/rest/v1/pyblocks_site_commands",
            {
                method: "POST",
                body: JSON.stringify({
                    command: "reload",
                    created_by: user.id,
                }),
            },
            true,
        );
    }

    async function listFriends() {
        const user = currentUser();
        if (!user) return { accepted: [], incoming: [], outgoing: [] };
        const rows = await request(
            "/rest/v1/pyblocks_friendships?select=id,requester_id,addressee_id,status,created_at&order=created_at.desc",
            { method: "GET" },
            true,
        );
        const profiles = await getProfiles(
            rows.map((row) =>
                row.requester_id === user.id
                    ? row.addressee_id
                    : row.requester_id,
            ),
        );
        const profileMap = new Map(
            profiles.map((profile) => [profile.user_id, profile]),
        );
        const decorated = rows.map((row) => {
            const otherId =
                row.requester_id === user.id
                    ? row.addressee_id
                    : row.requester_id;
            return { ...row, profile: profileMap.get(otherId) };
        });
        return {
            accepted: decorated.filter((row) => row.status === "accepted"),
            incoming: decorated.filter(
                (row) =>
                    row.status === "pending" && row.addressee_id === user.id,
            ),
            outgoing: decorated.filter(
                (row) =>
                    row.status === "pending" && row.requester_id === user.id,
            ),
        };
    }

    async function sendFriendRequest(username) {
        const user = currentUser();
        if (!user) throw new Error("Sign in to add friends.");
        const target = await getProfileByUsername(String(username).trim());
        if (!target) throw new Error("That PyBlocks user was not found.");
        if (target.user_id === user.id)
            throw new Error("You cannot add yourself as a friend.");

        const relationships = await listFriends();
        const matchesTarget = (friendship) =>
            friendship.profile?.user_id === target.user_id;
        if (relationships.accepted.some(matchesTarget))
            throw new Error(`You and @${target.username} are already friends.`);
        if (relationships.incoming.some(matchesTarget))
            throw new Error(
                `@${target.username} already sent you a friend request. Accept it below.`,
            );
        if (relationships.outgoing.some(matchesTarget))
            throw new Error(
                `Your friend request to @${target.username} is already pending.`,
            );

        try {
            await request(
                "/rest/v1/pyblocks_friendships",
                {
                    method: "POST",
                    body: JSON.stringify({
                        requester_id: user.id,
                        addressee_id: target.user_id,
                    }),
                },
                true,
            );
        } catch (error) {
            if (error.code === "23505")
                throw new Error(
                    `A friend request between you and @${target.username} already exists.`,
                );
            throw error;
        }
        return target;
    }

    async function acceptFriendRequest(id) {
        const rows = await request(
            `/rest/v1/pyblocks_friendships?id=eq.${encodeURIComponent(id)}`,
            {
                method: "PATCH",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    status: "accepted",
                    updated_at: new Date().toISOString(),
                }),
            },
            true,
        );
        return rows?.[0] || null;
    }

    async function createLiveLobby(projectId) {
        const user = currentUser();
        if (!user) throw new Error("Sign in to start Live Edit.");
        const existing = await request(
            `/rest/v1/pyblocks_live_lobbies?project_id=eq.${encodeURIComponent(projectId)}&select=id,project_id,owner_id,is_open&limit=1`,
            { method: "GET" },
            true,
        );
        let lobby = existing?.[0];
        if (!lobby) {
            const rows = await request(
                "/rest/v1/pyblocks_live_lobbies",
                {
                    method: "POST",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({
                        project_id: projectId,
                        owner_id: user.id,
                    }),
                },
                true,
            );
            lobby = rows?.[0];
        }
        await request(
            "/rest/v1/pyblocks_live_lobby_members?on_conflict=lobby_id,user_id",
            {
                method: "POST",
                headers: { Prefer: "resolution=merge-duplicates" },
                body: JSON.stringify({ lobby_id: lobby.id, user_id: user.id }),
            },
            true,
        );
        return lobby;
    }

    async function inviteFriendToLobby(lobbyId, recipientId) {
        const user = currentUser();
        await request(
            "/rest/v1/pyblocks_live_invites",
            {
                method: "POST",
                body: JSON.stringify({
                    lobby_id: lobbyId,
                    sender_id: user.id,
                    recipient_id: recipientId,
                }),
            },
            true,
        );
    }

    async function listLiveInvites() {
        const user = currentUser();
        if (!user) return [];
        const now = encodeURIComponent(new Date().toISOString());
        const rows = await request(
            `/rest/v1/pyblocks_live_invites?recipient_id=eq.${encodeURIComponent(user.id)}&status=eq.pending&expires_at=gt.${now}&select=id,lobby_id,sender_id,created_at,expires_at&order=created_at.desc`,
            { method: "GET" },
            true,
        );
        const profiles = await getProfiles(rows.map((row) => row.sender_id));
        const profileMap = new Map(
            profiles.map((profile) => [profile.user_id, profile]),
        );
        return rows.map((row) => ({
            ...row,
            sender: profileMap.get(row.sender_id),
        }));
    }

    async function answerLiveInvite(id, accept) {
        const rows = await request(
            `/rest/v1/pyblocks_live_invites?id=eq.${encodeURIComponent(id)}`,
            {
                method: "PATCH",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    status: accept ? "accepted" : "dismissed",
                    responded_at: new Date().toISOString(),
                }),
            },
            true,
        );
        const invite = rows?.[0];
        if (accept && invite) {
            await request(
                "/rest/v1/pyblocks_live_lobby_members",
                {
                    method: "POST",
                    body: JSON.stringify({
                        lobby_id: invite.lobby_id,
                        user_id: currentUser().id,
                    }),
                },
                true,
            );
        }
        return invite;
    }

    async function getLiveLobby(lobbyId) {
        const rows = await request(
            `/rest/v1/pyblocks_live_lobbies?id=eq.${encodeURIComponent(lobbyId)}&select=id,project_id,owner_id,is_open&limit=1`,
            { method: "GET" },
            true,
        );
        return rows?.[0] || null;
    }

    async function listLiveMembers(lobbyId) {
        const rows = await request(
            `/rest/v1/pyblocks_live_lobby_members?lobby_id=eq.${encodeURIComponent(lobbyId)}&select=user_id,joined_at,last_seen_at`,
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

    async function leaveLiveLobby(lobbyId) {
        const user = currentUser();
        if (!user) return;
        await request(
            `/rest/v1/pyblocks_live_lobby_members?lobby_id=eq.${encodeURIComponent(lobbyId)}&user_id=eq.${encodeURIComponent(user.id)}`,
            { method: "DELETE" },
            true,
        );
    }

    async function touchLiveLobby(lobbyId) {
        const user = currentUser();
        if (!user) return;
        await request(
            `/rest/v1/pyblocks_live_lobby_members?lobby_id=eq.${encodeURIComponent(lobbyId)}&user_id=eq.${encodeURIComponent(user.id)}`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    last_seen_at: new Date().toISOString(),
                }),
            },
            true,
        );
    }

    async function listLiveChatMessages(lobbyId) {
        const rows = await request(
            `/rest/v1/pyblocks_live_chat_messages?lobby_id=eq.${encodeURIComponent(lobbyId)}&select=id,sender_id,body,created_at&order=created_at.asc&limit=200`,
            { method: "GET" },
            true,
        );
        const profiles = await getProfiles(rows.map((row) => row.sender_id));
        const profileMap = new Map(
            profiles.map((chatProfile) => [chatProfile.user_id, chatProfile]),
        );
        return rows.map((row) => ({
            ...row,
            sender: profileMap.get(row.sender_id),
        }));
    }

    async function sendLiveChatMessage(lobbyId, body) {
        const message = String(body || "")
            .trim()
            .slice(0, 1000);
        if (!message) throw new Error("Type a message first.");
        const rows = await request(
            "/rest/v1/pyblocks_live_chat_messages",
            {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    lobby_id: lobbyId,
                    sender_id: currentUser().id,
                    body: message,
                }),
            },
            true,
        );
        return rows?.[0] || null;
    }

    async function endLiveLobby(lobbyId) {
        const rows = await request(
            `/rest/v1/pyblocks_live_lobbies?id=eq.${encodeURIComponent(lobbyId)}`,
            {
                method: "PATCH",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    is_open: false,
                    updated_at: new Date().toISOString(),
                }),
            },
            true,
        );
        return rows?.[0] || null;
    }

    return {
        configured,
        currentUser,
        getAccessToken,
        signUp,
        signIn,
        requestPasswordReset,
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
        grantAchievement,
        setRankTag,
        publishAnnouncement,
        getActiveAnnouncements,
        listUpdates,
        queueUpdate,
        activateUpdate,
        reloadEveryone,
        listFriends,
        sendFriendRequest,
        acceptFriendRequest,
        createLiveLobby,
        inviteFriendToLobby,
        listLiveInvites,
        answerLiveInvite,
        getLiveLobby,
        listLiveMembers,
        leaveLiveLobby,
        touchLiveLobby,
        listLiveChatMessages,
        sendLiveChatMessage,
        endLiveLobby,
        compress,
        decompress,
    };
})();
