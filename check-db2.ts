import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  const { data: bookings, error: e1 } = await supabase.from("bookings").select("id").limit(10);
  console.log("Bookings:", bookings?.length, e1);
  const { data: slots, error: e2 } = await supabase.from("slots").select("id").limit(10);
  console.log("Slots:", slots?.length, e2);
  const { data: services, error: e3 } = await supabase.from("services").select("id, name").limit(10);
  console.log("Services:", services?.length, e3);
}

check();
