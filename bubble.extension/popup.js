// Bubble Extension - Popup Script
// Fixed flow: checks for pending captures on load

const GEMINI_API_KEY = 'AIzaSyAaHfKLEGDsrIgurWoCRUQiCsUdGuyRBlU';

// State
let steps = [];
let currentStep = 0;
let capturedImage = null;

// DOM Elements
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
const stepsContainer = document.getElementById('stepsContainer');
const stepContent = document.getElementById('stepContent');
const stepIndicator = document.getElementById('stepIndicator');
const prevStepBtn = document.getElementById('prevStep');
const nextStepBtn = document.getElementById('nextStep');
const askMoreBtn = document.getElementById('askMoreBtn');
const errorArea = document.getElementById('errorArea');

// ====== CHECK FOR PENDING CAPTURE ON LOAD ======
document.addEventListener('DOMContentLoaded', async () => {
    // Check if there's a pending captured region
    const result = await chrome.storage.local.get(['capturedRegion', 'captureTime']);

    if (result.capturedRegion) {
        const age = Date.now() - (result.captureTime || 0);

        // Only process if captured within last 60 seconds
        if (age < 60000) {
            capturedImage = result.capturedRegion;

            // Clear storage
            await chrome.storage.local.remove(['capturedRegion', 'captureTime']);

            // Show preview and analyze
            previewImage.src = capturedImage;
            previewArea.classList.remove('hidden');
            emptyState.classList.add('hidden');

            // Start analysis
            captureBtn.disabled = true;
            btnText.innerHTML = '<span class="loading">Analyzing...</span>';
            await analyzeImage();
        } else {
            // Too old, clear it
            await chrome.storage.local.remove(['capturedRegion', 'captureTime']);
        }
    }
});

// Settings
settingsBtn.addEventListener('click', () => settingsPanel.classList.toggle('hidden'));
closeSettings.addEventListener('click', () => settingsPanel.classList.add('hidden'));

chrome.storage.sync.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) apiKeyInput.value = result.geminiApiKey;
});

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        chrome.storage.sync.set({ geminiApiKey: key }, () => {
            keyStatus.textContent = 'Saved!';
            setTimeout(() => keyStatus.textContent = '', 2000);
        });
    }
});

// Step Navigation
prevStepBtn.addEventListener('click', () => {
    if (currentStep > 0) {
        currentStep--;
        renderCurrentStep();
    }
});

nextStepBtn.addEventListener('click', () => {
    if (currentStep < steps.length - 1) {
        currentStep++;
        renderCurrentStep();
    }
});

// Ask More
askMoreBtn.addEventListener('click', async () => {
    if (!capturedImage) return;
    askMoreBtn.disabled = true;
    askMoreBtn.textContent = 'Thinking...';

    try {
        const stored = await chrome.storage.sync.get(['geminiApiKey']);
        const apiKey = stored.geminiApiKey || GEMINI_API_KEY;

        const result = await callGemini(apiKey, capturedImage,
            `Please explain step ${currentStep + 1} in more detail. Break it down further.`
        );

        const newSteps = parseSteps(result);
        if (newSteps.length > 0) {
            steps.splice(currentStep + 1, 0, ...newSteps);
            currentStep++;
            renderCurrentStep();
        }
    } catch (err) {
        showError(err.message);
    } finally {
        askMoreBtn.disabled = false;
        askMoreBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>Explain more`;
    }
});

// ====== CAPTURE BUTTON ======
captureBtn.addEventListener('click', async () => {
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('No active tab');

        // Inject content script
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        // Tell content script to start selection
        await chrome.tabs.sendMessage(tab.id, { type: 'START_SELECTION' });

        // The popup will close when user clicks on the page
        // When they finish selecting, background will save the image
        // When they click the extension again, this popup will load
        // and check for pending capture (see DOMContentLoaded handler above)

    } catch (err) {
        showError('Could not start selection: ' + err.message);
    }
});

// ====== ANALYZE IMAGE ======
async function analyzeImage() {
    try {
        const stored = await chrome.storage.sync.get(['geminiApiKey']);
        const apiKey = stored.geminiApiKey || GEMINI_API_KEY;

        const result = await callGemini(apiKey, capturedImage,
            `Analyze this image. If it contains math:
1. Identify the problem
2. Solve step by step
3. Use LaTeX for math: $inline$ or $$display$$
4. Number steps clearly

Use markdown for formatting.`
        );

        steps = parseSteps(result);
        currentStep = 0;
        renderCurrentStep();
        stepsContainer.classList.remove('hidden');

    } catch (err) {
        showError(err.message);
    } finally {
        resetButton();
    }
}

// Parse steps
function parseSteps(text) {
    const stepPatterns = /(?:Step\s*)?(\d+)[.:]\s*/gi;
    const parts = text.split(stepPatterns).filter(p => p.trim());

    const result = [];
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (/^\d+$/.test(part) && i + 1 < parts.length) {
            result.push({ number: parseInt(part), content: parts[i + 1].trim() });
            i++;
        } else if (result.length === 0 && part.length > 20) {
            result.push({ number: 1, content: part });
        }
    }

    if (result.length === 0) {
        result.push({ number: 1, content: text.trim() });
    }

    return result;
}

// Render step with Markdown + LaTeX
function renderCurrentStep() {
    const step = steps[currentStep];
    if (!step) return;

    let html = marked.parse(step.content);
    stepContent.innerHTML = html;

    if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(stepContent, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false
        });
    }

    stepIndicator.textContent = `${currentStep + 1} / ${steps.length}`;
    prevStepBtn.disabled = currentStep === 0;
    nextStepBtn.disabled = currentStep === steps.length - 1;
}

// API Call
async function callGemini(apiKey, imageDataUrl, prompt) {
    const base64 = imageDataUrl.replace(/^data:image\/(png|jpeg|webp);base64,/, '');

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
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

// Helpers
function resetButton() {
    captureBtn.disabled = false;
    btnText.textContent = 'Select Region';
}

function showError(msg) {
    errorArea.textContent = msg;
    errorArea.classList.remove('hidden');
    resetButton();
}
