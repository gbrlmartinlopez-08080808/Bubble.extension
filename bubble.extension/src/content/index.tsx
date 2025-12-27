import React from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from '@/components/Overlay';
import css from '@/index.css?inline'; // Vite inline import

const HOST_ID = 'bubble-extension-host';

function init() {
    if (document.getElementById(HOST_ID)) return;

    const host = document.createElement('div');
    host.id = HOST_ID;
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // Inject styles
    const style = document.createElement('style');
    style.textContent = css;
    shadow.appendChild(style);

    // Mount React
    const rootElement = document.createElement('div');
    rootElement.id = 'bubble-root';
    shadow.appendChild(rootElement);

    createRoot(rootElement).render(
        <React.StrictMode>
            <Overlay />
        </React.StrictMode>
    );
}

init();
