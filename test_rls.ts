import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabaseAdmin.rpc('get_tables_rls');
  console.log("Error:", error);
  console.log("Data:", data);
  
  // Actually, we can just run a raw query
  // Since we can't run raw SQL directly with supabase client without a function, let's create a SQL migration that adds the policy.
}
run();
