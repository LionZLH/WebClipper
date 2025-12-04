let isSelecting = false;
let overlay = null;

// Check if running inside dashboard widget
if (window.self !== window.top) {
    // Use referrer to detect dashboard context synchronously
    if (document.referrer && document.referrer.includes('dashboard.html')) {
        const injectBase = () => {
            const base = document.createElement('base');
            base.target = '_blank';
            (document.head || document.documentElement).appendChild(base);
        };

        // Inject immediately if possible, or wait for head
        if (document.head || document.documentElement) {
            injectBase();
        } else {
            document.addEventListener('DOMContentLoaded', injectBase);
        }

        // Aggressively intercept clicks to ensure new tab
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href) {
                // Check if it's a javascript: link or similar
                if (link.href.startsWith('javascript:')) return;

                e.preventDefault();
                e.stopPropagation();
                window.open(link.href, '_blank');
            }
        }, true); // Capture phase
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleSelection") {
        isSelecting = !isSelecting;
        if (isSelecting) {
            enableSelection();
        } else {
            disableSelection();
        }
    }
});

function enableSelection() {
    document.body.style.cursor = "crosshair";
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("click", handleClick);
    console.log("WebClip: Selection enabled");
}

function disableSelection() {
    document.body.style.cursor = "default";
    document.removeEventListener("mouseover", handleMouseOver);
    document.removeEventListener("mouseout", handleMouseOut);
    document.removeEventListener("click", handleClick);
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
    console.log("WebClip: Selection disabled");
}

function handleMouseOver(event) {
    if (!isSelecting) return;
    const target = event.target;

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "webclip-highlight-overlay";
        overlay.style.position = "absolute";
        overlay.style.pointerEvents = "none";
        overlay.style.border = "2px solid red";
        overlay.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
        overlay.style.zIndex = "999999";
        document.body.appendChild(overlay);
    }

    const rect = target.getBoundingClientRect();
    overlay.style.top = (rect.top + window.scrollY) + "px";
    overlay.style.left = (rect.left + window.scrollX) + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
}

function handleMouseOut(event) {
    // Optional
}

function handleClick(event) {
    if (!isSelecting) return;
    event.preventDefault();
    event.stopPropagation();

    const target = event.target;
    const rect = target.getBoundingClientRect();

    const widgetData = {
        id: Date.now().toString(),
        url: window.location.href,
        title: document.title,
        rect: {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height
        },
        pageWidth: document.documentElement.scrollWidth,
        pageHeight: document.documentElement.scrollHeight,
        createdAt: new Date().toISOString()
    };

    console.log("WebClip: Captured widget", widgetData);

    chrome.storage.local.get(["widgets"], (result) => {
        const widgets = result.widgets || [];
        widgets.push(widgetData);
        chrome.storage.local.set({ widgets: widgets }, () => {
            console.log("WebClip: Widget saved");
            disableSelection();
            alert("Widget clipped! Open Dashboard to view.");
        });
    });
}
