import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aukqqlesyvtllxiqjpxs.supabase.co';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DCspepUMSnA93LirTiaDTw_yCPZBfQ9';

// Clean up the URL and Key in case there are quotes or trailing spaces from the environment
const supabaseUrl = typeof rawUrl === 'string' ? rawUrl.trim().replace(/^["'](.+)["']$/, '$1') : '';
const supabaseAnonKey = typeof rawKey === 'string' ? rawKey.trim().replace(/^["'](.+)["']$/, '$1') : '';

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error('Invalid or missing Supabase URL. Please check your VITE_SUPABASE_URL secret.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
