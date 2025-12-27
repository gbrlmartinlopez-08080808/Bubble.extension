import { supabase } from '@/lib/supabase';

// Helper to open side panel
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
    console.log('Bubble installed');
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CAPTURE_SCREENSHOT') {
        handleScreenshot(sendResponse);
        return true; // async response
    }
});

// Handle Commands (Keyboard Shortcuts)
chrome.commands.onCommand.addListener((command) => {
    if (command === '_execute_action') {
        // This opens side panel by default if configured in manifest/setPanelBehavior
    }
    // Custom command to toggle overlay
    if (command === 'toggle-overlay') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_OVERLAY' });
            }
        });
    }
});

async function handleScreenshot(sendResponse: (response: any) => void) {
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
        sendResponse({ success: true, dataUrl });
    } catch (err: any) {
        sendResponse({ success: false, error: err.message || err });
    }
}
