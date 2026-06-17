import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabaseAdmin.rpc("get_column_info", { table_name: "transactions" });
  if (error) {
    // try querying pg_catalog
    const { data: qData, error: qErr } = await supabaseAdmin.from("transactions").select("payment_method").limit(1);
    console.log("Q", qData, qErr);
  }
}
check();
