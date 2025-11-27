/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Try to get env vars from Vite's import.meta.env first, then fall back to process.env (replaced by Vite config)
const getEnvVar = (key: keyof ImportMetaEnv, processKey: string): string => {
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  // This will be replaced by string literal in build if defined in vite.config.ts
  return (process.env as any)[processKey] || '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing! Check your .env file.");
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');