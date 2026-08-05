"use strict";

(() => {
    if (window.location.port === "4173") return;
    const config = window.PyBlocksCloudConfig;
    const cloud = window.PyBlocksCloud;
    if (!config?.supabaseUrl || !config?.publishableKey || !window.supabase)
        return;

    const client = window.supabase.createClient(
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
    const tables = [
        "pyblocks_profiles",
        "pyblocks_projects",
        "pyblocks_banners",
        "pyblocks_user_banners",
        "pyblocks_achievements",
        "pyblocks_user_achievements",
        "pyblocks_admins",
        "pyblocks_announcements",
    ];
    let channel = null;

    function emitChange(payload) {
        document.dispatchEvent(
            new CustomEvent("pyblocks:realtime", {
                detail: {
                    table: payload.table,
                    eventType: payload.eventType,
                    new: payload.new,
                    old: payload.old,
                },
            }),
        );
    }

    async function connect() {
        if (channel) await client.removeChannel(channel);
        const token = await cloud.getAccessToken();
        if (token) await client.realtime.setAuth(token);

        channel = client.channel("pyblocks-live");
        tables.forEach((table) => {
            channel.on(
                "postgres_changes",
                { event: "*", schema: "public", table },
                emitChange,
            );
        });
        channel.subscribe((status) => {
            document.documentElement.dataset.liveSync =
                status === "SUBSCRIBED" ? "connected" : "connecting";
        });
    }

    document.addEventListener("pyblocks:cloud-session", () => {
        void connect();
    });
    window.addEventListener("online", () => {
        void connect();
    });
    window.addEventListener("beforeunload", () => {
        if (channel) void client.removeChannel(channel);
    });
    void connect();
})();
