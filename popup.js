document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'dashboard.html' });
});

document.getElementById('start-selection').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
        chrome.tabs.sendMessage(tab.id, { action: "toggleSelection" }, { frameId: 0 });
        window.close();
    }
});
