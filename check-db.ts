import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  const { data, error } = await supabase.from("transactions").select("status, created_at").limit(100);
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Total recent transactions found:", data?.length);
  
  const statuses = data?.reduce((acc: any, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});
  
  console.log("Statuses breakdown:", statuses);
  console.log("Sample of 3:", data?.slice(0, 3));
}

check();
