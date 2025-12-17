// nody_helper.js

(function () {
    console.log("[NODY] nody js running...");
})();

/* 
    function waitForApp(cb, retries = 50, delay = 100) { //?
        if (window.app && typeof window.app.registerExtension === "function") {
            cb(window.app);
        } else if (retries > 0) {
            setTimeout(() => waitForApp(cb, retries - 1, delay), delay);
        } else {
            console.warn("[nody.helper] app not found");
        }
    }

    function onNodeSearchOpen(callback) {
        const selector = "div[id^='pv_id_'][id$='_panel'].p-autocomplete-overlay.p-component";

        const existing = document.querySelector(selector);
        if (existing) callback(existing);
        console.log("found panel"); // not showing

        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    const match = node.matches(selector) ? node : node.querySelector(selector);
                    if (match) {
                        callback(match);
                        return;
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    waitForApp((app) => {
        app.registerExtension({
            name: "nody.helper",
            setup() {
                console.log("[nody.helper] setup running"); // not showing

                onNodeSearchOpen((panel) => {
                    console.log("[nody.helper] node search overlay detected", panel);
                    panel.style.border = "4px solid red";
                    panel.style.boxShadow = "0 0 0 4px red";
                });
            },
        });
    });
})();

//debug

(function () {
    console.log("[NODY] nody js running...");

    // 1. Directly import app from ComfyUI (no waitForApp yet)
    import("../../scripts/app.js").then(({ app }) => {
        console.log("[NODY] app imported:", !!app);

        app.registerExtension({
            name: "nody.helper",
            async setup() {
                console.log("[NODY] setup running");
            },
        });
    }).catch((err) => {
        console.error("[NODY] failed to import app.js", err);
    });
})();
*/