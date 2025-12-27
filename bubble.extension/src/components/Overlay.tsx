import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, RefreshCw, Send } from 'lucide-react';
import { GlassCard, GlassButton, GlassInput } from './ui';
import { StepCard } from './StepCard';
import { askGemini } from '@/lib/gemini';

export const Overlay: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState('');
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const listener = (msg: any) => {
            if (msg.type === 'TOGGLE_OVERLAY') setVisible(v => !v);
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    const handleCapture = async () => {
        setLoading(true);
        setError(null);
        setResponse('');

        try {
            // 1. Capture
            const captured: any = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
            if (!captured.success || !captured.dataUrl) throw new Error('Failed to capture screenshot');

            // 2. Ask AI
            const prompt = input || "Explain this step-by-step. Solve any math problems you see.";
            const stream = await askGemini(prompt, captured.dataUrl);

            // 3. Handle Stream
            if (typeof stream === 'string') {
                // If fallback returns string
                setResponse(stream);
            } else {
                const reader = stream.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    setResponse((prev: string) => prev + chunk);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            drag
            dragMomentum={false}
            className="fixed top-8 right-8 z-[999999] w-[400px] font-sans text-white/90"
        >
            <GlassCard className="flex flex-col gap-4 max-h-[80vh] shadow-2xl border-white/10 backdrop-blur-2xl bg-black/40">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-pink-500" />
                        <h2 className="font-semibold text-lg tracking-tight">Bubble</h2>
                    </div>
                    <button
                        onClick={() => setVisible(false)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto min-h-[100px] max-h-[500px] scrollbar-hide py-2">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {!response && !loading && !error && (
                        <div className="text-center py-8 text-white/40 space-y-2">
                            <Camera className="w-12 h-12 mx-auto opacity-50 mb-2" />
                            <p className="text-sm">Click capture to analyze this page.</p>
                        </div>
                    )}

                    {(response || loading) && (
                        <StepCard
                            title={loading && !response ? "Analyzing..." : "Reasoning"}
                            content={response}
                            isStreaming={loading}
                        />
                    )}
                </div>

                {/* Action Area */}
                <div className="border-t border-white/10 pt-3 flex gap-2">
                    <GlassInput
                        placeholder="Ask a question..."
                        className="flex-1 text-sm"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCapture()}
                    />
                    <GlassButton
                        onClick={handleCapture}
                        disabled={loading}
                        className={loading ? 'opacity-50' : 'bg-gradient-to-r from-orange-500/80 to-pink-500/80 hover:from-orange-500 hover:to-pink-500 border-none shadow-lg shadow-pink-500/20'}
                    >
                        {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                    </GlassButton>
                </div>

            </GlassCard>
        </motion.div>
    );
};
