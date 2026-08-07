"use strict";

window.PyBlocksAccountPortal = (() => {
    let dialog;

    function markup() {
        return `
        <div id="account-dialog" class="dialog-backdrop" aria-hidden="true" hidden>
          <section class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
            <div class="dialog-header">
              <div><h2 id="account-dialog-title">Join PyBlocks</h2><p>Save projects and share what you build.</p></div>
              <button id="account-dialog-close" class="dialog-close-btn" type="button" aria-label="Close sign in">×</button>
            </div>
            <form id="account-form" class="account-form">
              <label>Action<select name="mode"><option value="signin">Sign in</option><option value="signup">Create account</option></select></label>
              <label data-identifier>Username or email<input name="identifier" autocomplete="username" required /></label>
              <label data-username hidden>Username<input name="username" minlength="3" maxlength="32" pattern="[A-Za-z0-9_]+" autocomplete="username" /></label>
              <label data-email hidden>Email<input name="email" type="email" autocomplete="email" /></label>
              <label>Password<input name="password" type="password" minlength="8" autocomplete="current-password" required /></label>
              <button class="account-text-action" data-forgot-password type="button">Forgot Password?</button>
              <button class="primary-cta account-submit" type="submit">Continue</button>
              <p id="account-form-status" role="status" aria-live="polite">Passwords are secured by Supabase Auth.</p>
            </form>
          </section>
        </div>
        <div id="account-menu" class="account-menu" hidden>
          <a href="dashboard.html">Dashboard</a>
          <a href="achievements.html">Achievements</a>
          <a href="editor.html">New project</a>
        </div>`;
    }

    async function recover(form) {
        const status = document.getElementById("account-form-status");
        const identifier = form.elements.identifier.value.trim();
        if (!identifier) {
            status.textContent = "Enter your username or email first.";
            form.elements.identifier.focus();
            return;
        }
        status.textContent = "Sending a secure reset link…";
        try {
            status.textContent =
                await window.PyBlocksCloud.requestPasswordReset(identifier);
        } catch (error) {
            status.textContent = error.message;
        }
    }

    function updateButton() {
        const button = document.getElementById("home-account-btn");
        if (!button) return;
        const user = window.PyBlocksCloud.currentUser();
        button.textContent = user ? user.username : "Sign in";
        button.classList.toggle("is-signed-in", Boolean(user));
    }

    function open() {
        const user = window.PyBlocksCloud.currentUser();
        if (user) {
            const menu = document.getElementById("account-menu");
            menu.hidden = !menu.hidden;
            return;
        }
        window.PyBlocksDialogs.open(dialog, {
            opener: document.getElementById("home-account-btn"),
            initialFocus: dialog.querySelector("select"),
            onEscape: close,
        });
    }

    function close() {
        window.PyBlocksDialogs.close(dialog);
    }

    async function submit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const status = document.getElementById("account-form-status");
        const values = Object.fromEntries(new window.FormData(form));
        status.textContent =
            values.mode === "signup" ? "Creating account…" : "Signing in…";
        try {
            if (values.mode === "signup") {
                const result = await window.PyBlocksCloud.signUp(values);
                status.textContent = result.message;
                if (!result.signedIn) return;
            } else {
                await window.PyBlocksCloud.signIn(values);
            }
            await window.PyBlocksCloud.ensureProfile();
            updateButton();
            window.location.href = "dashboard.html";
        } catch (error) {
            status.textContent = error.message;
        }
    }

    function init() {
        document.getElementById("account-dialog-host").innerHTML = markup();
        dialog = document.getElementById("account-dialog");
        document
            .getElementById("home-account-btn")
            .addEventListener("click", open);
        document
            .getElementById("account-dialog-close")
            .addEventListener("click", close);
        const form = document.getElementById("account-form");
        form.addEventListener("submit", submit);
        form.elements.mode.addEventListener("change", () => {
            const field = form.querySelector("[data-username]");
            const emailField = form.querySelector("[data-email]");
            const identifierField = form.querySelector("[data-identifier]");
            const forgot = form.querySelector("[data-forgot-password]");
            const signingUp = form.elements.mode.value === "signup";
            field.hidden = !signingUp;
            field.querySelector("input").required = signingUp;
            emailField.hidden = !signingUp;
            emailField.querySelector("input").required = signingUp;
            identifierField.hidden = signingUp;
            identifierField.querySelector("input").required = !signingUp;
            forgot.hidden = signingUp;
            form.elements.password.autocomplete = signingUp
                ? "new-password"
                : "current-password";
        });
        form.querySelector("[data-forgot-password]").addEventListener(
            "click",
            () => void recover(form),
        );
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) close();
        });
        document.addEventListener("pyblocks:cloud-session", updateButton);
        updateButton();
    }

    return { init };
})();

document.addEventListener(
    "DOMContentLoaded",
    window.PyBlocksAccountPortal.init,
);
