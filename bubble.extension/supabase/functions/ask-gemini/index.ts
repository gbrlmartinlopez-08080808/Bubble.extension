import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get the authorization header from the request
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        // Verify the user
        // In a real Edge Function, supabase.auth.getUser() verifies the JWT
        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
            throw new Error('Invalid token');
        }

        const { prompt, image, mimeType } = await req.json();

        // Check credits
        const { data: credits, error: creditError } = await supabase
            .from('user_credits')
            .select('amount')
            .eq('user_id', user.id)
            .single();

        if (creditError || !credits || credits.amount <= 0) {
            return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
                status: 402,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Call Gemini
        // This uses the SERVER-SIDE platform key which is secure
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) throw new Error('Server misconfiguration: No API Key');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

        // Construct parts
        const parts = [{ text: prompt }];
        if (image) {
            // Expecting base64 image data without the header or handling it here
            const cleanBase64 = image.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
            parts.push({
                inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType || "image/png",
                },
            });
        }

        const result = await model.generateContentStream(parts);

        // Deduct credit (1 credit per successful call initiation)
        await supabase.rpc('decrement_credit', { user_id_arg: user.id });
        // *Note: Ideally we'd implement a decrement_credit RPC or just update:
        await supabase.from('user_credits').update({ amount: credits.amount - 1 }).eq('user_id', user.id);

        // Log usage
        await supabase.from('usage_logs').insert({
            user_id: user.id,
            model: 'gemini-pro-vision'
        });

        // Create a stream response
        const stream = new ReadableStream({
            async start(controller) {
                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    controller.enqueue(new TextEncoder().encode(text));
                }
                controller.close();
            }
        });

        return new Response(stream, {
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
