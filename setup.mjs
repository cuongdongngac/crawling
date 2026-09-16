import fs from 'fs';
fs.mkdirSync('utils/supabase', { recursive: true });
fs.writeFileSync('utils/supabase/client.ts', \import { createBrowserClient } from '@supabase/ssr';\n\nexport function createClient() {\n  return createBrowserClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!\n  );\n}\n\);
