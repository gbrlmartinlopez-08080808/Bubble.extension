import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';
import { useStore } from './store';

export async function askGemini(
    prompt: string,
    image: string | null // Base64
): Promise<ReadableStream<Uint8Array> | string> {
    const { settings } = useStore.getState();

    // 1. BYOK Mode: Client-side call
    if (settings.apiKey) {
        console.log('Using User API Key (BYOK)');
        const genAI = new GoogleGenerativeAI(settings.apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

        const parts: any[] = [{ text: prompt }];
        if (image) {
            // Remove header if present
            const cleanBase64 = image.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
            parts.push({
                inlineData: {
                    data: cleanBase64,
                    mimeType: "image/png",
                },
            });
        }

        const result = await model.generateContentStream(parts);

        // Convert Gemini stream to ReadableStream for unified handling
        return new ReadableStream({
            async start(controller) {
                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    controller.enqueue(new TextEncoder().encode(text));
                }
                controller.close();
            }
        });
    }

    // 2. Platform Mode: Supabase Edge Function Proxy
    else {
        console.log('Using Platform Credits (Proxy)');
        const { data, error } = await supabase.functions.invoke('ask-gemini', {
            body: {
                prompt,
                image,
                mimeType: 'image/png'
            },
            headers: {
                // Authorization is handled automatically by supabase-js if user is logged in
            },
            method: "POST"
        });

        if (error) {
            if (error.context?.status === 402) {
                throw new Error('Insufficient credits. Please add an API Key or upgrade.');
            }
            throw new Error(`AI Error: ${error.message}`);
        }

        // supabase.functions.invoke with resultType: 'arraybuffer' or handling stream is tricky.
        // The standard client usually buffers. For true streaming, we need fetch directly
        // but authorized with the user's session.

        // Workaround for true streaming from Edge Function using fetch + session:
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) throw new Error('Authentication required for Platform credits.');

        const response = await fetch(`${supabase.functions.url}/ask-gemini`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt, image, mimeType: 'image/png' })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Unknown error');
        }

        if (!response.body) throw new Error('No response body');
        return response.body; // This is a ReadableStream
    }
}
