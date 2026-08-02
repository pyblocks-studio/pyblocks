const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./tests",
    testMatch: "**/*.spec.js",
    timeout: 20_000,
    expect: { timeout: 7_000 },
    fullyParallel: true,
    reporter: "line",
    use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
    webServer: {
        command: "npm run serve",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: true,
    },
    projects: [
        { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
        { name: "webkit-desktop", use: { ...devices["Desktop Safari"] } },
        { name: "small-iphone", use: { ...devices["iPhone SE"] } },
        { name: "large-iphone", use: { ...devices["iPhone 15"] } },
        { name: "phone-landscape", use: { ...devices["iPhone 15 landscape"] } },
        { name: "tablet", use: { ...devices["iPad Pro 11"] } },
    ],
});
