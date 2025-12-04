const RULE_ID = 1;

async function updateRules() {
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [RULE_ID],
        addRules: [
            {
                id: RULE_ID,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    responseHeaders: [
                        { header: "X-Frame-Options", operation: "remove" },
                        { header: "Content-Security-Policy", operation: "remove" },
                        { header: "Frame-Options", operation: "remove" }
                    ]
                },
                condition: {
                    // Apply to all requests. 
                    // Ideally we limit this to requests initiated by our dashboard, 
                    // but initiatorDomains for extensions can be tricky depending on browser version.
                    // For now, we'll apply it broadly but we could refine it to only apply 
                    // when the tab URL is our dashboard.
                    // However, since the iframe request is what matters, and the iframe is inside our dashboard...
                    // Let's try to restrict by initiatorDomains if possible, or just apply it generally for now 
                    // as this is a local tool.
                    resourceTypes: ["sub_frame"]
                }
            }
        ]
    });
    console.log("Rules updated to remove X-Frame-Options");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkDashboardContext") {
        const isDashboard = sender.tab && sender.tab.url && sender.tab.url.includes('dashboard.html');
        sendResponse({ isDashboard: !!isDashboard });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    updateRules();
});
