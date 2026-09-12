import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read .env
const envText = fs.readFileSync(".env", "utf8");
const urlMatch = envText.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = envText.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const url = urlMatch ? urlMatch[1].trim() : "";
const key = keyMatch ? keyMatch[1].trim() : "";

console.log("Supabase URL:", url);
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from("schedules").select("id, origin, destination, vehicle_name, departure_date").limit(200);
  if (error) {
    console.error("Supabase error:", error.message);
    return;
  }
  console.log("Total rows in Supabase schedules:", data?.length);
  const origins = [...new Set(data?.map(d => d.origin))];
  const dests = [...new Set(data?.map(d => d.destination))];
  console.log("Distinct origins in Supabase:", origins);
  console.log("Distinct destinations in Supabase:", dests);

  // Check if Ubay is in Supabase
  const ubayRows = data?.filter(d => /ubay/i.test(d.origin) || /ubay/i.test(d.destination));
  console.log("Ubay rows in Supabase:", ubayRows?.length);
  if (ubayRows && ubayRows.length > 0) {
    console.log(ubayRows.slice(0, 5));
  }
}

check().catch(console.error);
