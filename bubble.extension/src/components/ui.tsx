import { ComponentProps } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const GlassCard = ({ className, ...props }: ComponentProps<'div'>) => (
    <div className={cn("glass-panel rounded-xl p-4 text-white", className)} {...props} />
);

export const GlassButton = ({ className, ...props }: ComponentProps<'button'>) => (
    <button
        className={cn(
            "glass-button px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all text-white",
            className
        )}
        {...props}
    />
);

export const GlassInput = ({ className, ...props }: ComponentProps<'input'>) => (
    <input
        className={cn(
            "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all",
            className
        )}
        {...props}
    />
);
