"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("password-reset-form");
    const status = document.getElementById("password-reset-status");
    const config = window.PyBlocksCloudConfig;
    const client = window.supabase.createClient(
        config.supabaseUrl,
        config.publishableKey,
        {
            auth: {
                detectSessionInUrl: true,
                persistSession: false,
            },
        },
    );

    const hash = new window.URLSearchParams(window.location.hash.slice(1));
    if (hash.get("error_description")) {
        status.textContent = decodeURIComponent(hash.get("error_description"));
        form.querySelector("button").disabled = true;
    } else {
        const { data } = await client.auth.getSession();
        if (data.session) {
            status.textContent = "Secure reset link accepted.";
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const password = form.elements.password.value;
        const confirmation = form.elements.confirmation.value;
        if (password !== confirmation) {
            status.textContent = "The two passwords do not match.";
            form.elements.confirmation.focus();
            return;
        }
        if (password.length < 8) {
            status.textContent = "Use at least 8 characters.";
            form.elements.password.focus();
            return;
        }

        const button = form.querySelector("button");
        button.disabled = true;
        status.textContent = "Changing your password…";
        const { error } = await client.auth.updateUser({ password });
        if (error) {
            status.textContent =
                error.message ||
                "This reset link is invalid or expired. Request a new one.";
            button.disabled = false;
            return;
        }
        status.textContent =
            "Password changed. Returning you to the sign-in page…";
        await client.auth.signOut();
        window.setTimeout(() => {
            window.location.replace("index.html");
        }, 1400);
    });
});
