// Environment Constants
// In a real production app, some of these might be behind a secure build process or env vars.
// For this architecture, we embed the public anon key for Supabase.

export const SUPABASE_URL = 'https://hxpxxamrbzbsemhndtar.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cHh4YW1yYnpic2VtaG5kdGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTU1NTksImV4cCI6MjA4MjQzMTU1OX0.cHGELNJt7lKsRtdNOGSdc3MNp7etcgeviLOHVqhXCNc';

// Initial platform key - strictly for the Edge Function usage if implementing client-side workaround,
// BUT in our architecture this should primarily be used by the Edge Function.
// We expose it here only because the user specifically provided it for this "complete wired integration" context.
// In a stricter production setup, this would ONLY exist in the Edge Function environment secrets.
export const GEMINI_PLATFORM_API_KEY = 'AIzaSyAaHfKLEGDsrIgurWoCRUQiCsUdGuyRBlU';

export const EXTENSION_NAME = 'Bubble';
