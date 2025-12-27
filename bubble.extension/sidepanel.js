// Bubble - Side Panel Script
// No external dependencies - everything inline

const GEMINI_API_KEY = 'AIzaSyAaHfKLEGDsrIgurWoCRUQiCsUdGuyRBlU';

// DOM
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKey');
const keyStatus = document.getElementById('keyStatus');
const captureBtn = document.getElementById('captureBtn');
const btnText = document.getElementById('btnText');
const emptyState = document.getElementById('emptyState');
const previewArea = document.getElementById('previewArea');
const previewImage = document.getElementById('previewImage');
const responseArea = document.getElementById('responseArea');
const responseContent = document.getElementById('responseContent');
const errorArea = document.getElementById('errorArea');

let capturedImage = null;

// Settings
settingsBtn.onclick = () => settingsPanel.classList.toggle('hidden');
closeSettings.onclick = () => settingsPanel.classList.add('hidden');

chrome.storage.sync.get(['geminiApiKey'], r => {
    if (r.geminiApiKey) apiKeyInput.value = r.geminiApiKey;
});

saveKeyBtn.onclick = () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        chrome.storage.sync.set({ geminiApiKey: key }, () => {
            keyStatus.textContent = 'Saved!';
            setTimeout(() => keyStatus.textContent = '', 2000);
        });
    }
};

// Listen for captures from background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'CAPTURE_COMPLETE') {
        capturedImage = msg.dataUrl;
        previewImage.src = capturedImage;
        previewArea.classList.remove('hidden');
        emptyState.classList.add('hidden');

        // Auto-analyze
        analyzeImage();
    }

    if (msg.type === 'CAPTURE_ERROR') {
        showError(msg.error);
        resetButton();
    }
});

// Capture button
captureBtn.onclick = async () => {
    resetUI();
    captureBtn.disabled = true;
    btnText.innerHTML = '<span class="loading">Select on page...</span>';

    try {
        await chrome.runtime.sendMessage({ type: 'START_SELECTION' });
    } catch (err) {
        showError(err.message);
        resetButton();
    }
};

// Analyze
async function analyzeImage() {
    if (!capturedImage) return;

    btnText.innerHTML = '<span class="loading">Analyzing...</span>';

    try {
        const stored = await chrome.storage.sync.get(['geminiApiKey']);
        const apiKey = stored.geminiApiKey || GEMINI_API_KEY;

        const result = await callGemini(apiKey, capturedImage);

        responseContent.innerHTML = formatResponse(result);
        responseArea.classList.remove('hidden');

    } catch (err) {
        showError(err.message);
    } finally {
        resetButton();
    }
}

// API call
async function callGemini(apiKey, imageDataUrl) {
    const base64 = imageDataUrl.replace(/^data:image\/(png|jpeg|webp);base64,/, '');

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        {
                            text: `Analyze this image. If it contains math problems:
- Solve step by step
- Show your work clearly
- Use ** for bold, * for italic
- For math equations, write them clearly

Format nicely with numbered steps.` },
                        { inline_data: { mime_type: "image/png", data: base64 } }
                    ]
                }]
            })
        }
    );

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'API failed');
    }

    const data = await response.json();
    if (data.candidates?.[0]?.content?.parts) {
        return data.candidates[0].content.parts.map(p => p.text).join('\n');
    }
    throw new Error('No response');
}

// Format response (simple markdown)
function formatResponse(text) {
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Code
    html = html.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Math display ($$...$$)
    html = html.replace(/\$\$([^$]+)\$\$/g, '<div class="math-block">$1</div>');

    // Math inline ($...$)
    html = html.replace(/\$([^$]+)\$/g, '<span class="math-inline">$1</span>');

    // Lists
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li><strong>$1.</strong> $2</li>');

    // Step formatting
    html = html.replace(/Step (\d+)[:.]/gi, '<div class="step-card"><div class="step-header"><span class="step-number">$1</span><span class="step-title">Step $1</span></div>');

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap
    if (!html.startsWith('<')) {
        html = '<p>' + html + '</p>';
    }

    return html;
}

// Helpers
function resetUI() {
    errorArea.classList.add('hidden');
    responseArea.classList.add('hidden');
    capturedImage = null;
}

function resetButton() {
    captureBtn.disabled = false;
    btnText.textContent = 'Select Region';
}

function showError(msg) {
    errorArea.textContent = msg;
    errorArea.classList.remove('hidden');
    resetButton();
}
