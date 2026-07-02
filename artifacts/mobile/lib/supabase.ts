// Supabase client — fully optional. The app bundles and runs whether or not the
// @supabase/supabase-js package is installed. Cloud account features only turn
// on when the package is present AND the EXPO_PUBLIC_SUPABASE_* env vars are set.
//
// The requires below sit inside try/catch, so Metro treats them as OPTIONAL
// dependencies: a missing package is a build-time warning, never a fatal
// "Unable to resolve module" error. Once you run
//   pnpm add @supabase/supabase-js react-native-url-polyfill
// (and set the env vars) the cloud features light up automatically.
import AsyncStorage from "@react-native-async-storage/async-storage";

// URL polyfill is recommended by Supabase on React Native, but optional here —
// Hermes ships built-in URL support that covers the auth/storage usage.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-native-url-polyfill/auto");
} catch {
  // polyfill not installed — fine, fall back to Hermes' built-in URL
}

type CreateClient = (url: string, key: string, opts?: any) => any;

let createClient: CreateClient | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  createClient = require("@supabase/supabase-js").createClient as CreateClient;
} catch {
  createClient = null;
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey && createClient);

export const supabase: any = isSupabaseConfigured
  ? (createClient as CreateClient)(url as string, anonKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
