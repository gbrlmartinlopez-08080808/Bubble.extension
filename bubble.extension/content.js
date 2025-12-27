// Bubble - Content Script
// Region selection overlay

(function () {
    if (window.__bubbleActive) return;
    window.__bubbleActive = true;

    let overlay, box;
    let startX, startY, selecting = false;

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'BEGIN_SELECTION') {
            createOverlay();
            sendResponse({ ok: true });
        }
        return true;
    });

    function createOverlay() {
        cleanup();

        overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.4); cursor: crosshair;
            z-index: 2147483647; font-family: system-ui, sans-serif;
        `;

        const hint = document.createElement('div');
        hint.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #000; color: #fff; padding: 10px 20px;
            border-radius: 8px; font-size: 13px; font-weight: 500;
        `;
        hint.textContent = 'Click and drag to select • ESC to cancel';
        overlay.appendChild(hint);

        box = document.createElement('div');
        box.style.cssText = `
            position: fixed; border: 2px solid #fff;
            background: rgba(255,255,255,0.1); pointer-events: none; display: none;
        `;
        overlay.appendChild(box);

        document.body.appendChild(overlay);

        overlay.addEventListener('mousedown', onDown);
        overlay.addEventListener('mousemove', onMove);
        overlay.addEventListener('mouseup', onUp);
        document.addEventListener('keydown', onKey);
    }

    function onDown(e) {
        selecting = true;
        startX = e.clientX;
        startY = e.clientY;
        box.style.display = 'block';
        box.style.left = startX + 'px';
        box.style.top = startY + 'px';
        box.style.width = '0';
        box.style.height = '0';
    }

    function onMove(e) {
        if (!selecting) return;
        const x = Math.min(startX, e.clientX);
        const y = Math.min(startY, e.clientY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);
        box.style.left = x + 'px';
        box.style.top = y + 'px';
        box.style.width = w + 'px';
        box.style.height = h + 'px';
    }

    function onUp(e) {
        if (!selecting) return;
        selecting = false;

        const rect = {
            x: parseInt(box.style.left),
            y: parseInt(box.style.top),
            width: parseInt(box.style.width),
            height: parseInt(box.style.height),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        };

        cleanup();

        if (rect.width > 10 && rect.height > 10) {
            setTimeout(() => {
                chrome.runtime.sendMessage({ type: 'CAPTURE_REGION', rect });
            }, 100);
        }
    }

    function onKey(e) {
        if (e.key === 'Escape') cleanup();
    }

    function cleanup() {
        if (overlay) overlay.remove();
        overlay = null;
        document.removeEventListener('keydown', onKey);
        window.__bubbleActive = false;
    }
})();
