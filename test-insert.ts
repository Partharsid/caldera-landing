import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testInsert() {
  const transactionData = {
    amount: 100,
    payment_method: "cash",
    status: "paid",
    items_json: [],
    customer_phone: "1234567890",
    customer_name: "Test",
    comment: "Test transaction"
  };

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .insert([transactionData])
    .select()
    .single();

  if (error) {
    console.error("Failed to insert transaction:", error);
  } else {
    console.log("Inserted transaction:", data);
  }
}

testInsert();
