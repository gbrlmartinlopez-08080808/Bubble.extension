import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { GlassCard, cn } from './ui';

interface StepCardProps {
    title: string;
    content: string;
    isStreaming?: boolean;
}

export const StepCard = ({ title, content, isStreaming }: StepCardProps) => {
    const [expanded, setExpanded] = useState(true);

    return (
        <GlassCard className="mb-3 overflow-hidden border-l-4 border-l-purple-500/50">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    {isStreaming ? (
                        <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">
                            ✓
                        </div>
                    )}
                    <h3 className="font-semibold text-sm">{title}</h3>
                </div>
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                            {content}
                            {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 bg-purple-400 animate-pulse" />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </GlassCard>
    );
};
