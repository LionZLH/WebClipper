let widgetsData = [];
let isEditMode = false;
let draggedWidget = null;
let pannedWidget = null;
let startX = 0, startY = 0;
let initialLeft = 0, initialTop = 0;
let initialRectX = 0, initialRectY = 0;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('clear-all-btn').addEventListener('click', clearAllWidgets);
    document.getElementById('edit-mode-btn').addEventListener('click', toggleEditMode);

    // Banner Logic
    const header = document.getElementById('dashboard-header');
    const changeCoverBtn = document.getElementById('change-cover-btn');
    const bannerUpload = document.getElementById('banner-upload');
    const coverOptions = document.getElementById('cover-options');
    const uploadCoverBtn = document.getElementById('upload-cover-btn');
    const presetSwatches = document.querySelectorAll('.preset-swatch');

    // Load saved banner
    chrome.storage.local.get(['dashboardBanner'], (result) => {
        if (result.dashboardBanner) {
            header.style.backgroundImage = result.dashboardBanner.startsWith('data:') ? `url(${result.dashboardBanner})` : result.dashboardBanner;
            header.classList.add('has-banner');
        }
    });

    changeCoverBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        coverOptions.style.display = coverOptions.style.display === 'flex' ? 'none' : 'flex';
    });

    // Hide options when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!coverOptions.contains(e.target) && e.target !== changeCoverBtn) {
            coverOptions.style.display = 'none';
        }
    });

    uploadCoverBtn.addEventListener('click', () => {
        bannerUpload.click();
    });

    bannerUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                header.style.backgroundImage = `url(${dataUrl})`;
                header.classList.add('has-banner');
                chrome.storage.local.set({ dashboardBanner: dataUrl });
            };
            reader.readAsDataURL(file);
        }
    });

    presetSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const bg = swatch.getAttribute('data-bg');
            header.style.backgroundImage = bg;
            header.classList.add('has-banner');
            chrome.storage.local.set({ dashboardBanner: bg });
        });
    });

    // Title Logic
    const titleEl = document.getElementById('dashboard-title');
    chrome.storage.local.get(['dashboardTitle'], (result) => {
        if (result.dashboardTitle) {
            titleEl.innerText = result.dashboardTitle;
            document.title = result.dashboardTitle;
        }
    });

    titleEl.addEventListener('blur', () => {
        const newTitle = titleEl.innerText;
        chrome.storage.local.set({ dashboardTitle: newTitle });
        document.title = newTitle;
    });

    // Optional: Save on Enter key
    titleEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            titleEl.blur();
        }
    });

    loadWidgets();
});

function clearAllWidgets() {
    if (confirm("Are you sure you want to clear all widgets?")) {
        chrome.storage.local.set({ widgets: [] }, () => {
            loadWidgets();
        });
    }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('edit-mode-btn');
    const container = document.getElementById('dashboard-container');
    const coverOptions = document.getElementById('cover-options');

    if (isEditMode) {
        btn.textContent = "Done";
        document.body.classList.add('edit-mode'); // Apply to body for global styling
        enableFreeLayout();
    } else {
        btn.textContent = "Edit";
        document.body.classList.remove('edit-mode');
        coverOptions.style.display = 'none'; // Hide options when exiting edit mode
        disableFreeLayout();
    }
}

function enableFreeLayout() {
    const container = document.getElementById('dashboard-container');
    const widgets = container.querySelectorAll('.widget');

    widgets.forEach((widget, index) => {
        const data = widgetsData[index];
        let left, top;

        if (data.x !== undefined && data.y !== undefined) {
            left = data.x;
            top = data.y;
        } else {
            left = widget.offsetLeft;
            top = widget.offsetTop;
            data.x = left;
            data.y = top;
        }

        widget.style.position = 'absolute';
        widget.style.left = left + 'px';
        widget.style.top = top + 'px';
        widget.style.margin = '0';

        if (data.zIndex) {
            widget.style.zIndex = data.zIndex;
        }
    });

    container.style.height = '2000px';
}

function disableFreeLayout() {
    saveWidgets(false);
}

function loadWidgets() {
    chrome.storage.local.get(["widgets"], (result) => {
        widgetsData = result.widgets || [];
        renderWidgets();
    });
}

function renderWidgets() {
    const container = document.getElementById('dashboard-container');
    container.innerHTML = '';

    if (widgetsData.length === 0) {
        container.innerHTML = '<p>No widgets clipped yet. Go to a website and clip something!</p>';
        return;
    }

    // Clear container
    container.innerHTML = '';

    // Separate widgets into positioned and unpositioned
    const positionedWidgets = widgetsData.filter(w => w.x !== undefined && w.y !== undefined);
    const unpositionedWidgets = widgetsData.filter(w => w.x === undefined || w.y === undefined);

    // Render positioned widgets first to establish occupied space
    positionedWidgets.forEach((widget, index) => {
        // Find original index in full array
        const originalIndex = widgetsData.indexOf(widget);
        const widgetEl = createWidgetElement(widget, originalIndex);
        widgetEl.style.left = `${widget.x}px`;
        widgetEl.style.top = `${widget.y}px`;
        container.appendChild(widgetEl);
    });

    // Position new widgets
    unpositionedWidgets.forEach((widget) => {
        const originalIndex = widgetsData.indexOf(widget);
        const pos = findFreePosition(widget, widgetsData);
        widget.x = pos.x;
        widget.y = pos.y;

        const widgetEl = createWidgetElement(widget, originalIndex);
        widgetEl.style.left = `${widget.x}px`;
        widgetEl.style.top = `${widget.y}px`;
        container.appendChild(widgetEl);
    });

    // Save updated positions if any were assigned
    if (unpositionedWidgets.length > 0) {
        saveWidgets(false);
    }

    const hasPosition = widgetsData.some(w => w.x !== undefined);
    if (hasPosition) {
        container.style.position = 'relative';
        container.style.height = '2000px';

        Array.from(container.children).forEach((el, i) => {
            const data = widgetsData[i];
            if (data.x !== undefined) {
                el.style.position = 'absolute';
                el.style.left = data.x + 'px';
                el.style.top = data.y + 'px';
                el.style.margin = '0';
                if (data.zIndex) el.style.zIndex = data.zIndex;
            }
        });
    }
}

function findFreePosition(newWidget, allWidgets) {
    const startX = 20;
    const startY = 160; // Below header
    const stepX = 20;
    const stepY = 20;
    const containerWidth = document.getElementById('dashboard-container').clientWidth;

    let x = startX;
    let y = startY;

    const newWidth = parseFloat(newWidget.width) || 400;
    const newHeight = parseFloat(newWidget.height) || 300;

    let found = false;
    let maxAttempts = 500; // Prevent infinite loop

    while (!found && maxAttempts > 0) {
        let collision = false;

        for (const w of allWidgets) {
            if (w === newWidget) continue;
            if (w.x === undefined || w.y === undefined) continue;

            const wWidth = parseFloat(w.width) || 400;
            const wHeight = parseFloat(w.height) || 300;

            // Check intersection
            if (x < w.x + wWidth &&
                x + newWidth > w.x &&
                y < w.y + wHeight &&
                y + newHeight > w.y) {
                collision = true;
                break;
            }
        }

        if (!collision) {
            found = true;
        } else {
            x += stepX;
            if (x + newWidth > containerWidth - 20) {
                x = startX;
                y += stepY;
            }
        }
        maxAttempts--;
    }

    return { x, y };
}

function createWidgetElement(widget, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'widget';
    wrapper.dataset.index = index;

    if (widget.width) wrapper.style.width = widget.width;
    if (widget.height) wrapper.style.height = widget.height;

    // Header for dragging widget
    const header = document.createElement('div');
    header.className = 'widget-header';
    header.innerHTML = `
            <div class="widget-title" title="${widget.title}">${widget.title}</div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <button class="invert-btn" title="Invert Colors">◑</button>
                <button class="delete-btn" title="Delete Widget">&times;</button>
            </div>
        `;
    wrapper.appendChild(header);

    const invertBtn = header.querySelector('.invert-btn');
    invertBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWidgetInvert(index);
    });

    const deleteBtn = header.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteWidget(index);
    });

    // Apply forced invert class if state is true
    if (widget.isInverted) {
        wrapper.classList.add('force-inverted');
    }

    const zoomControls = document.createElement('div');
    zoomControls.className = 'widget-zoom-controls';
    zoomControls.innerHTML = `
    <button class="zoom-btn zoom-in" data-index="${index}">+</button>
    <button class="zoom-btn zoom-out" data-index="${index}">-</button>
  `;
    wrapper.appendChild(zoomControls);

    // Zoom Handlers
    zoomControls.querySelector('.zoom-in').addEventListener('click', (e) => {
        e.stopPropagation();
        applyIncrementalZoom(index, 0.05);
    });

    zoomControls.querySelector('.zoom-out').addEventListener('click', (e) => {
        e.stopPropagation();
        applyIncrementalZoom(index, -0.05);
    });

    // Prevent drag on zoom controls
    zoomControls.addEventListener('mousedown', (e) => e.stopPropagation());

    // Bring to Front on Interaction
    wrapper.addEventListener('mousedown', () => {
        if (!isEditMode) return;
        bringToFront(index, wrapper);
    });

    // Header Drag Logic
    header.addEventListener('mousedown', (e) => {
        if (!isEditMode) return;
        // Don't drag if clicking buttons
        if (e.target.tagName === 'BUTTON') return;

        e.preventDefault();

        pushHistory(); // Capture state before drag

        draggedWidget = wrapper;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = wrapper.offsetLeft;
        initialTop = wrapper.offsetTop;

        // z-index handled by wrapper mousedown

        document.addEventListener('mousemove', handleWidgetDragMove);
        document.addEventListener('mouseup', handleWidgetDragUp);
    });

    const contentContainer = document.createElement('div');
    contentContainer.className = 'widget-content';
    contentContainer.style.width = '100%';
    // contentContainer.style.height = 'calc(100% - 30px)'; // Removed to let Flexbox handle it
    contentContainer.style.overflow = 'hidden';
    contentContainer.style.position = 'relative';

    // Panner Overlay
    const panner = document.createElement('div');
    panner.className = 'content-panner';
    contentContainer.appendChild(panner);

    // Panning Logic
    panner.addEventListener('mousedown', (e) => {
        if (!isEditMode) return;
        e.preventDefault();

        // Panning doesn't strictly need undo if it's just view adjustment, 
        // but if it changes persistent state (rect.x/y), maybe it should?
        // User asked for "Move" (position) and "Delete". 
        // Panning changes the *content* position. I'll include it for completeness.
        pushHistory();

        pannedWidget = {
            index: index,
            iframe: iframe,
            data: widget
        };
        startX = e.clientX;
        startY = e.clientY;
        initialRectX = widget.rect.x;
        initialRectY = widget.rect.y;

        panner.style.cursor = 'grabbing';

        document.addEventListener('mousemove', handleContentPanMove);
        document.addEventListener('mouseup', handleContentPanUp);
    });

    const iframe = document.createElement('iframe');
    iframe.src = widget.url;
    iframe.scrolling = 'no';
    iframe.style.position = 'absolute';
    iframe.style.border = 'none';

    const w = widget.viewportWidth || widget.pageWidth || 1920;
    const h = widget.pageHeight || 3000;
    iframe.style.width = `${w}px`;
    iframe.style.height = `${h}px`;

    // Calculate Scale
    let scale = 1;
    if (widget.isScaled) {
        // Fit Width
        const containerWidth = parseFloat(widget.width) || 400;
        const clipWidth = widget.rect.width || 500;
        scale = containerWidth / clipWidth;
    } else if (widget.customScale) {
        scale = widget.customScale;
    }

    iframe.style.transform = `translate(-${widget.rect.x}px, -${widget.rect.y}px) scale(${scale})`;
    iframe.style.transformOrigin = 'top left';

    contentContainer.appendChild(iframe);
    wrapper.appendChild(contentContainer);

    header.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteWidget(index);
    });

    // Resize Handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    wrapper.appendChild(resizeHandle);

    resizeHandle.addEventListener('mousedown', (e) => {
        if (!isEditMode) return;
        e.stopPropagation();
        e.preventDefault();

        pushHistory(); // Capture state before resize

        resizingWidget = {
            element: wrapper,
            index: index,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: wrapper.offsetWidth,
            startHeight: wrapper.offsetHeight,
            aspectRatio: (widget.rect.width || 1) / (widget.rect.height || 1),
            isScaled: widget.isScaled
        };

        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeUp);
    });

    const resizeObserver = new ResizeObserver(debounce((entries) => {
        for (let entry of entries) {
            const el = entry.target;
            // Only update if we are not currently dragging/resizing to avoid conflict loops?
            // Actually, we need to update scale if isScaled is true and width changed.

            if (widget.isScaled) {
                const newWidth = entry.contentRect.width;
                const clipWidth = widget.rect.width || 500;
                const newScale = newWidth / clipWidth;
                iframe.style.transform = `translate(-${widget.rect.x}px, -${widget.rect.y}px) scale(${newScale})`;
            }

            if (el.style.width && el.style.height) {
                widgetsData[index].width = el.style.width;
                widgetsData[index].height = el.style.height;
                saveWidgets(false);
            }
        }
    }, 100)); // Faster debounce for smoother scaling

    resizeObserver.observe(wrapper);

    return wrapper;
}

function applyIncrementalZoom(index, delta) {
    const widget = widgetsData[index];
    const wrapper = document.querySelector(`.widget[data-index="${index}"]`);
    const iframe = wrapper.querySelector('iframe');
    const header = wrapper.querySelector('.widget-header');

    let currentScale = widget.customScale || (widget.isScaled ? (parseFloat(wrapper.style.width) / (widget.rect.width || 500)) : 1);
    let newScale = currentScale + delta;

    // Clamp scale
    newScale = Math.max(0.1, Math.min(newScale, 5.0));

    // Disable auto-scale if manually zooming
    if (widget.isScaled) {
        widget.isScaled = false;
    }

    widget.customScale = newScale;

    // Apply scale (keep position)
    iframe.style.transform = `translate(-${widget.rect.x}px, -${widget.rect.y}px) scale(${newScale})`;

    saveWidgets(false);
}

// Undo History
let historyStack = [];
const MAX_HISTORY = 5;

function pushHistory() {
    // Deep copy widgetsData
    const state = JSON.parse(JSON.stringify(widgetsData));
    historyStack.push(state);
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift(); // Remove oldest
    }
}

function undo() {
    if (historyStack.length === 0) return;

    const prevState = historyStack.pop();
    widgetsData = prevState;
    saveWidgets(true);
}

// Undo Listener
document.addEventListener('keydown', (e) => {
    if (!isEditMode) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
    }
});

let resizingWidget = null;

function handleResizeMove(e) {
    if (!resizingWidget) return;

    const dx = e.clientX - resizingWidget.startX;
    const dy = e.clientY - resizingWidget.startY;

    let newWidth = resizingWidget.startWidth + dx;
    let newHeight = resizingWidget.startHeight + dy;

    // Snap to grid (10px)
    newWidth = Math.round(newWidth / 10) * 10;

    // Only snap height if NOT scaled (aspect ratio locked)
    if (!resizingWidget.isScaled) {
        newHeight = Math.round(newHeight / 10) * 10;
    }

    // Enforce min size
    newWidth = Math.max(newWidth, 50);
    newHeight = Math.max(newHeight, 50);

    if (resizingWidget.isScaled) {
        // Lock Aspect Ratio
        // Aspect Ratio stored as W/H? No, let's use H/W for height calc.
        // stored aspectRatio was W/H.
        // newHeight = newWidth / (W/H) = newWidth * (H/W)
        newHeight = newWidth / resizingWidget.aspectRatio;
    }

    resizingWidget.element.style.width = `${newWidth}px`;
    resizingWidget.element.style.height = `${newHeight}px`;
}

function bringToFront(index, wrapper) {
    const maxZ = Math.max(...widgetsData.map(w => w.zIndex || 0), 0) + 1;

    // Only update if not already top
    if (widgetsData[index].zIndex === maxZ - 1) return;

    wrapper.style.zIndex = maxZ;
    widgetsData[index].zIndex = maxZ;
    saveWidgets(false);
}

function handleResizeUp(e) {
    if (!resizingWidget) return;

    pushHistory(); // Capture state before resize
    const index = resizingWidget.index;
    widgetsData[index].width = resizingWidget.element.style.width;
    widgetsData[index].height = resizingWidget.element.style.height;

    resizingWidget = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeUp);

    saveWidgets(false);
}

// Widget Drag Handlers
function handleWidgetDragMove(e) {
    if (!draggedWidget) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const rawLeft = initialLeft + dx;
    const rawTop = initialTop + dy;

    // Snap to 10px grid
    const snappedLeft = Math.round(rawLeft / 10) * 10;
    const snappedTop = Math.round(rawTop / 10) * 10;

    draggedWidget.style.left = snappedLeft + 'px';
    draggedWidget.style.top = snappedTop + 'px';
}

function handleWidgetDragUp(e) {
    if (!draggedWidget) return;

    const index = parseInt(draggedWidget.dataset.index);
    widgetsData[index].x = draggedWidget.offsetLeft;
    widgetsData[index].y = draggedWidget.offsetTop;

    draggedWidget = null;
    document.removeEventListener('mousemove', handleWidgetDragMove);
    document.removeEventListener('mouseup', handleWidgetDragUp);

    saveWidgets(false);
}

// Content Pan Handlers
function handleContentPanMove(e) {
    if (!pannedWidget) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // If we drag mouse right (positive dx), we want content to move right.
    // Translate is (-x, -y).
    // So to move content right, we need to DECREASE x.
    // newX = initialX - dx

    // Retrieve current scale
    const widget = pannedWidget.data;
    let scale = 1;
    if (widget.isScaled) {
        const containerWidth = parseFloat(widgetsData[pannedWidget.index].width) || 400;
        const clipWidth = widget.rect.width || 500;
        scale = containerWidth / clipWidth;
    } else if (widget.customScale) {
        scale = widget.customScale;
    }

    // Adjust delta by scale to ensure 1:1 mouse tracking
    const newX = initialRectX - (dx / scale);
    const newY = initialRectY - (dy / scale);

    pannedWidget.iframe.style.transform = `translate(-${newX}px, -${newY}px) scale(${scale})`;

    // Update data in memory so it saves correctly
    widgetsData[pannedWidget.index].rect.x = newX;
    widgetsData[pannedWidget.index].rect.y = newY;
}

function handleContentPanUp(e) {
    if (!pannedWidget) return;

    const panner = document.querySelector(`.widget[data-index="${pannedWidget.index}"] .content-panner`);
    if (panner) panner.style.cursor = ''; // Reset cursor

    pannedWidget = null;
    document.removeEventListener('mousemove', handleContentPanMove);
    document.removeEventListener('mouseup', handleContentPanUp);

    saveWidgets(false);
}

function deleteWidget(index) {
    widgetsData.splice(index, 1);
    saveWidgets(true);
}

function toggleWidgetInvert(index) {
    widgetsData[index].isInverted = !widgetsData[index].isInverted;
    saveWidgets(true);
}

function saveWidgets(shouldRender) {
    chrome.storage.local.set({ widgets: widgetsData }, () => {
        if (shouldRender) renderWidgets();
    });
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Help Modal Logic
document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeModal = document.querySelector('.close-modal');

    if (helpBtn && helpModal && closeModal) {
        helpBtn.addEventListener('click', () => {
            helpModal.style.display = 'flex';
        });

        closeModal.addEventListener('click', () => {
            helpModal.style.display = 'none';
        });

        // Close on click outside
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.style.display = 'none';
            }
        });
    }

    // Settings Modal Logic
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsDarkModeToggle = document.getElementById('settings-dark-mode-toggle');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'flex';
            // Sync checkbox state
            if (settingsDarkModeToggle) {
                settingsDarkModeToggle.checked = document.body.classList.contains('dark-mode');
            }
        });

        // Close logic is handled by the generic close-modal listener below if we update it,
        // but currently we only selected ONE .close-modal. We need to select ALL.

        // Update close buttons to handle multiple modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                helpModal.style.display = 'none';
                settingsModal.style.display = 'none';
            });
        });

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });

        // Settings Toggle Logic
        if (settingsDarkModeToggle) {
            settingsDarkModeToggle.addEventListener('change', (e) => {
                const isDark = e.target.checked;
                if (isDark) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }

                chrome.storage.local.set({ darkMode: isDark });
            });
        }
    }

    // Auto Refresh Logic
    const refreshSelect = document.getElementById('refresh-rate-select');
    let refreshIntervalId = null;

    function applyAutoRefresh(minutes) {
        if (refreshIntervalId) clearInterval(refreshIntervalId);

        if (minutes > 0) {
            console.log(`Auto refresh set to ${minutes} minutes`);
            refreshIntervalId = setInterval(() => {
                console.log('Auto refreshing widgets...');
                document.querySelectorAll('.widget iframe').forEach(iframe => {
                    // Reload iframe
                    try {
                        iframe.src = iframe.src;
                    } catch (e) {
                        console.error('Error refreshing iframe:', e);
                    }
                });
            }, minutes * 60 * 1000);
        } else {
            console.log('Auto refresh disabled');
        }
    }

    // Load saved refresh rate
    chrome.storage.local.get(['refreshRate'], (result) => {
        const rate = result.refreshRate || 0;
        if (refreshSelect) refreshSelect.value = rate;
        applyAutoRefresh(rate);
    });

    if (refreshSelect) {
        refreshSelect.addEventListener('change', (e) => {
            const rate = parseInt(e.target.value);
            applyAutoRefresh(rate);
            chrome.storage.local.set({ refreshRate: rate });
        });
    }

    // Dark Mode Logic
    // Load saved preference
    chrome.storage.local.get(['darkMode'], (result) => {
        if (result.darkMode) {
            document.body.classList.add('dark-mode');
        }
    });

});
