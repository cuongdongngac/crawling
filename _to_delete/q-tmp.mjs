import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local","utf8").split(/\r?\n/)) { const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/); if(m) process.env[m[1]]=m[2].replace(/^["']|["']$/g,""); }
const { createClient } = await import(process.cwd()+"/node_modules/@supabase/supabase-js/dist/index.mjs").catch(()=>import("@supabase/supabase-js"));
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false}});
for (const t of ["posts","ai_labels","human_labels","ai_runs","eval_items","label_codebooks"]) { const r = await sb.from(t).select("*",{count:"exact",head:true}); console.log(t, r.count, r.error?.message); }
const r = await sb.from("system_settings").select("setting_key"); console.log(r.data?.map(x=>x.setting_key), r.error?.message);
const p = await sb.from("profiles").select("email,is_admin"); console.log(p.data);
const s = await sb.from("posts").select("raw_text,relevance,relevance_source").limit(5); console.log(s.data);
