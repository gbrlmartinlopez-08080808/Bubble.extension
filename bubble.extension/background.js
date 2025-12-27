// Bubble - Background Service Worker
// Uses side panel and handles screenshot capture

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
});

// Set side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // Start region selection
    if (message.type === 'START_SELECTION') {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (!tabs[0]) {
                sendResponse({ success: false, error: 'No active tab' });
                return;
            }

            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                });

                chrome.tabs.sendMessage(tabs[0].id, { type: 'BEGIN_SELECTION' });
                sendResponse({ success: true });
            } catch (err) {
                sendResponse({ success: false, error: err.message });
            }
        });
        return true;
    }

    // Capture region
    if (message.type === 'CAPTURE_REGION') {
        const rect = message.rect;

        chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
            if (chrome.runtime.lastError) {
                chrome.runtime.sendMessage({
                    type: 'CAPTURE_ERROR',
                    error: chrome.runtime.lastError.message
                });
                return;
            }

            try {
                const croppedUrl = await cropImage(dataUrl, rect);

                // Send directly to side panel
                chrome.runtime.sendMessage({
                    type: 'CAPTURE_COMPLETE',
                    dataUrl: croppedUrl
                });
            } catch (err) {
                // Fallback to full image
                chrome.runtime.sendMessage({
                    type: 'CAPTURE_COMPLETE',
                    dataUrl: dataUrl
                });
            }
        });
        return true;
    }

    // Full page capture
    if (message.type === 'CAPTURE_FULL') {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, dataUrl });
            }
        });
        return true;
    }
});

// Crop using OffscreenCanvas
async function cropImage(dataUrl, rect) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    // Calculate with device pixel ratio consideration
    const scale = bitmap.width / rect.viewportWidth;

    const x = Math.max(0, Math.round(rect.x * scale));
    const y = Math.max(0, Math.round(rect.y * scale));
    const w = Math.min(Math.round(rect.width * scale), bitmap.width - x);
    const h = Math.min(Math.round(rect.height * scale), bitmap.height - y);

    if (w <= 0 || h <= 0) {
        throw new Error('Invalid crop dimensions');
    }

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, x, y, w, h, 0, 0, w, h);

    const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(croppedBlob);
    });
}

console.log('Bubble background ready');
