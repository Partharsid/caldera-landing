import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, adminKey);

async function run() {
  console.log("1. Creating item as admin...");
  const { data: created, error: createError } = await supabaseAdmin
    .from("inventory")
    .insert([{
      item_name: "Test Item " + Date.now(),
      type: "food",
      price: 150,
      stock_count: 10
    }])
    .select()
    .single();
    
  if (createError) {
    console.error("Create error:", createError);
    return;
  }
  console.log("Created successfully:", created.id);
  
  console.log("2. Fetching items as anon...");
  const { data: fetched, error: fetchError } = await supabase
    .from("inventory")
    .select("*");
    
  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }
  console.log("Anon fetched count:", fetched.length);
  
  const found = fetched.find(i => i.id === created.id);
  if (found) {
    console.log("SUCCESS: Created item is visible to anon.");
  } else {
    console.log("FAILURE: Created item is NOT visible to anon.");
  }
  
  console.log("3. Fetching items as admin...");
  const { data: fetchedAdmin } = await supabaseAdmin
    .from("inventory")
    .select("*");
  console.log("Admin fetched count:", fetchedAdmin?.length);
}

run();
