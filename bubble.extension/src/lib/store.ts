import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { Message, UserSettings } from '@/types';
import { storage } from './storage';

interface AppState {
    user: User | null;
    credits: number;
    settings: UserSettings;
    messages: Message[];
    isLoading: boolean;

    // Actions
    setUser: (user: User | null) => void;
    setCredits: (credits: number) => void;
    updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
    addMessage: (message: Message) => void;
    setLoading: (loading: boolean) => void;
    initialize: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
    user: null,
    credits: 0,
    settings: {},
    messages: [],
    isLoading: false,

    setUser: (user) => set({ user }),
    setCredits: (credits) => set({ credits }),

    updateSettings: async (newSettings) => {
        const updated = await storage.updateSettings(newSettings);
        set({ settings: updated });
    },

    addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
    setLoading: (loading) => set({ isLoading: loading }),

    initialize: async () => {
        // Load settings from storage
        const settings = await storage.getSettings();
        set({ settings });
    }
}));
