export interface Message {
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: number;
    attachments?: {
        type: 'image';
        data: string; // base64
    }[];
}

export interface UserSettings {
    apiKey?: string;
    theme?: 'light' | 'dark' | 'system';
}

export interface ReasoningStep {
    title: string;
    content: string; // Markdown
    substeps?: ReasoningStep[];
    expanded?: boolean;
}
