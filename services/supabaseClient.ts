import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('ERRO: VITE_SUPABASE_URL não está definida!');
}
if (!supabaseAnonKey) {
  console.error('ERRO: VITE_SUPABASE_ANON_KEY não está definida!');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
