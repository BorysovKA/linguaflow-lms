/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // add other env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Augment the NodeJS namespace to include API_KEY in ProcessEnv
// This avoids "Cannot redeclare block-scoped variable 'process'" error if @types/node is present
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}
