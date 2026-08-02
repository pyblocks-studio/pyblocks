(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    root.PyBlocksExportService = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
    "use strict";

    function safeBaseName(requested, extension, fallback) {
        return (
            String(requested || "")
                .replace(new RegExp(`\\.${extension}$`, "i"), "")
                .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
                .trim() || fallback
        );
    }

    async function save(content, filename, type) {
        const blob = new Blob([content], { type });
        const file = new File([blob], filename, { type });
        if (
            navigator.maxTouchPoints > 0 &&
            navigator.canShare?.({ files: [file] })
        ) {
            try {
                await navigator.share({ files: [file], title: filename });
                return;
            } catch (error) {
                if (error.name === "AbortError") return;
                console.warn(
                    "Web Share failed; falling back to download.",
                    error,
                );
            }
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    return { safeBaseName, save };
});
