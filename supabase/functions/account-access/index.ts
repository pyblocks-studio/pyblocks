import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const allowedOrigins = new Set([
    "https://pyblocks-studio.github.io",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]);
const attemptWindowMs = 10 * 60 * 1000;
const maxAttemptsPerWindow = 5;
const signInAttempts = new Map<string, { count: number; resetAt: number }>();

function headers(origin: string | null) {
    const allowed = origin && allowedOrigins.has(origin) ? origin : "";
    return {
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json",
        Vary: "Origin",
    };
}

function json(origin: string | null, status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: headers(origin),
    });
}

async function emailForIdentifier(identifier: string) {
    if (!/^[A-Za-z0-9_]{3,32}$/.test(identifier)) return null;

    const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/pyblocks_profiles?username=ilike.${encodeURIComponent(identifier)}&select=user_id&limit=1`,
        {
            headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
            },
        },
    );
    if (!profileResponse.ok) return null;
    const profiles = await profileResponse.json();
    const userId = profiles?.[0]?.user_id;
    if (!userId) return null;

    const userResponse = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
        {
            headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
            },
        },
    );
    if (!userResponse.ok) return null;
    const user = await userResponse.json();
    const authUser = user?.user || user;
    return typeof authUser?.email === "string" ? authUser.email : null;
}

function rateLimitKey(identifier: string) {
    return identifier.toLowerCase();
}

function isRateLimited(key: string) {
    const now = Date.now();
    const current = signInAttempts.get(key);
    if (!current || current.resetAt <= now) {
        signInAttempts.set(key, {
            count: 1,
            resetAt: now + attemptWindowMs,
        });
        return false;
    }
    current.count += 1;
    return current.count > maxAttemptsPerWindow;
}

function clearAttempts(key: string) {
    signInAttempts.delete(key);
}

Deno.serve(async (request: Request) => {
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers: headers(origin) });
    if (request.method !== "POST" || !origin || !allowedOrigins.has(origin))
        return json(origin, 403, { message: "Request not allowed." });

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return json(origin, 400, { message: "Invalid request." });
    }

    const action = String(body.action || "");
    const identifier = String(body.identifier || "")
        .trim()
        .slice(0, 254);
    if (!identifier)
        return json(origin, 400, { message: "Enter a username or email." });

    if (action === "signin") {
        if (identifier.includes("@"))
            return json(origin, 400, {
                message: "Email sign-in must use Supabase Auth directly.",
            });
        const attemptKey = rateLimitKey(identifier);
        if (isRateLimited(attemptKey))
            return json(origin, 429, {
                message: "Too many sign-in attempts. Try again in 10 minutes.",
            });
        const password = String(body.password || "");
        const email = await emailForIdentifier(identifier);
        if (!email || !password)
            return json(origin, 400, {
                message: "Invalid username/email or password.",
            });
        const authResponse = await fetch(
            `${supabaseUrl}/auth/v1/token?grant_type=password`,
            {
                method: "POST",
                headers: {
                    apikey: anonKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            },
        );
        if (!authResponse.ok)
            return json(origin, 400, {
                message: "Invalid username/email or password.",
            });
        clearAttempts(attemptKey);
        return new Response(await authResponse.text(), {
            status: 200,
            headers: headers(origin),
        });
    }

    if (action === "recover") {
        const email = identifier.includes("@")
            ? identifier.toLowerCase()
            : await emailForIdentifier(identifier);
        if (email) {
            const localOrigin =
                origin === "http://localhost:8080" ||
                origin === "http://127.0.0.1:8080"
                    ? origin
                    : "https://pyblocks-studio.github.io";
            const path = localOrigin.includes("github.io")
                ? "/pyblocks/reset-password.html"
                : "/reset-password.html";
            await fetch(
                `${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(`${localOrigin}${path}`)}`,
                {
                    method: "POST",
                    headers: {
                        apikey: anonKey,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email }),
                },
            );
        }
        return json(origin, 200, { ok: true });
    }

    return json(origin, 400, { message: "Invalid request." });
});
