import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { GlassButton, GlassCard, GlassInput } from '@/components/ui';
import { Key, User, LogOut, Save } from 'lucide-react';

export default function App() {
    const { user, setUser, settings, updateSettings, initialize } = useStore();
    const [apiKey, setApiKey] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [view, setView] = useState<'auth' | 'settings'>('auth');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        initialize();
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) setView('settings');
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) setView('settings');
            else setView('auth');
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (settings.apiKey) setApiKey(settings.apiKey);
    }, [settings]);

    const handleLogin = async () => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg(error.message);
        else setMsg('Logged in!');
    };

    const handleSignUp = async () => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setMsg(error.message);
        else setMsg('Check your email to confirm!');
    };

    const saveKey = async () => {
        await updateSettings({ apiKey });
        setMsg('API Key Saved!');
        setTimeout(() => setMsg(''), 2000);
    };

    return (
        <div className="p-4 h-screen bg-zinc-950 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-pink-500">
                    Bubble
                </h1>
                {user && (
                    <button onClick={() => supabase.auth.signOut()} className="text-zinc-500 hover:text-white">
                        <LogOut size={16} />
                    </button>
                )}
            </div>

            {user ? (
                <div className="space-y-4">
                    <GlassCard>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                <User size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-medium">{user.email}</p>
                                <p className="text-xs text-zinc-500">Free Plan</p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <div className="flex items-center gap-2 mb-3">
                            <Key size={16} className="text-orange-400" />
                            <h2 className="font-semibold text-sm">Bring Your Own Key</h2>
                        </div>
                        <p className="text-xs text-zinc-400 mb-3">
                            Enter your Google Gemini API key to use your own quota.
                        </p>
                        <div className="flex gap-2">
                            <GlassInput
                                type="password"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="flex-1 text-xs"
                            />
                            <GlassButton onClick={saveKey} className="p-2">
                                <Save size={16} />
                            </GlassButton>
                        </div>
                        {msg && <p className="text-xs text-green-400 mt-2">{msg}</p>}
                    </GlassCard>
                </div>
            ) : (
                <div className="space-y-4 pt-10">
                    <GlassInput
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <GlassInput
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <GlassButton onClick={handleLogin} className="flex-1 bg-white text-black hover:bg-zinc-200">
                            Login
                        </GlassButton>
                        <GlassButton onClick={handleSignUp} className="flex-1">
                            Sign Up
                        </GlassButton>
                    </div>
                    {msg && <p className="text-center text-xs text-red-400">{msg}</p>}
                </div>
            )}
        </div>
    )
}
