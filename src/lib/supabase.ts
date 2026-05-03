import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean up the URL and Key
const cleanString = (val: any) => {
  if (typeof val !== 'string') return '';
  const cleaned = val.trim().replace(/^["']|["']$/g, '');
  return (cleaned === 'undefined' || cleaned === 'null') ? '' : cleaned;
};

const supabaseUrl = cleanString(rawUrl);
const supabaseAnonKey = cleanString(rawKey);

// Ensure the URL is just the origin and has no trailing slash
let finalUrl = supabaseUrl;
try {
  if (supabaseUrl.startsWith('http')) {
    const urlObj = new URL(supabaseUrl);
    finalUrl = urlObj.origin;
  }
} catch (e) {
  console.error('Supabase URL parsing failed:', e);
}

let supabase: any = null;
try {
  if (!finalUrl || !finalUrl.startsWith('http')) {
    console.error('Invalid or missing Supabase URL.');
    // Create a mock client that throws helpful errors instead of crashing the whole app
    supabase = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => { throw new Error('Supabase is not configured. Please check your VITE_SUPABASE_URL environment variable.'); },
        signUp: async () => { throw new Error('Supabase is not configured. Please check your VITE_SUPABASE_URL environment variable.'); },
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: new Error('Supabase not configured') }) }) }),
        insert: async () => ({ error: new Error('Supabase not configured') }),
        upsert: async () => ({ error: new Error('Supabase not configured') }),
        update: async () => ({ error: new Error('Supabase not configured') }),
        delete: async () => ({ eq: () => ({ error: new Error('Supabase not configured') }) }),
      })
    };
  } else {
    // Diagnostic log
    console.log('Supabase initialized with URL:', finalUrl.substring(0, 20) + '...');
    supabase = createClient(finalUrl, supabaseAnonKey || '');
  }
} catch (e) {
  console.error('Supabase client creation failed:', e);
}

export { supabase };
