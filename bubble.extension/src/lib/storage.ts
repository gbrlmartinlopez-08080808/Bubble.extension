import { UserSettings } from '@/types';

export const storage = {
    getSettings: async (): Promise<UserSettings> => {
        const result = await chrome.storage.sync.get(['settings']);
        return result.settings || {};
    },

    updateSettings: async (settings: Partial<UserSettings>) => {
        const current = await storage.getSettings();
        const updated = { ...current, ...settings };
        await chrome.storage.sync.set({ settings: updated });
        return updated;
    },

    // Securely store/retrieve local-only preferences if needed
    getLocal: async (key: string) => {
        const res = await chrome.storage.local.get([key]);
        return res[key];
    },

    setLocal: async (key: string, value: any) => {
        await chrome.storage.local.set({ [key]: value });
    }
};
