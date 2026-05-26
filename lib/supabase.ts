import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Public (anon) config is safe to ship in the client; RLS enforces access.
// Set these in .env as EXPO_PUBLIC_* so they are inlined at build time.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and " +
      "EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment (.env)."
  );
}

if (supabaseUrl.includes("YOUR-PROJECT") || supabaseAnonKey.includes("your-anon-key")) {
  console.warn(
    "\n⚠️  [Supabase Config Warning]\n" +
    "You are using default placeholder credentials in your .env file.\n" +
    "Please create a Supabase project at https://supabase.com and update EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file to avoid network failures.\n"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session detection in a native app.
    detectSessionInUrl: false,
  },
});
