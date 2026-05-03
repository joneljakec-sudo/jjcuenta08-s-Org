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

let supabase: any;
try {
  if (!finalUrl || !finalUrl.startsWith('http')) {
    console.error('Invalid Supabase URL:', finalUrl);
    supabase = null;
  } else {
    // Diagnostic log (visible in browser console for the user)
    console.log('Supabase initialized with URL:', finalUrl.substring(0, 15) + '...');
    supabase = createClient(finalUrl, supabaseAnonKey);
  }
} catch (e) {
  console.error('Supabase client creation failed:', e);
  supabase = null;
}

export { supabase };
