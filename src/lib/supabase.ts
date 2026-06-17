import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Check if environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    'Missing Supabase environment variables. Using placeholders. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for real data.'
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Database types (infer from your schema)
export type Service = {
  id: string;
  name: string;
  type: 'court' | 'machine' | 'table';
  base_price: number;
  peak_price: number;
  is_active: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
};

export type Inventory = {
  id: string;
  item_name: string;
  type: 'food' | 'beverage' | 'misc';
  stock_count: number;
  price: number;
  created_at: string;
  updated_at: string;
};

export type Slot = {
  id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'booked' | 'blocked';
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  amount: number;
  payment_method: 'cash' | 'upi' | 'razorpay';
  status: 'paid' | 'refunded' | 'pending';
  items_json: any; // JSONB data
  customer_phone?: string;
  customer_name?: string;
  comment?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  created_at: string;
  updated_at: string;
};

export type Membership = {
  id: string;
  user_phone: string;
  pass_name: string;
  hours_remaining: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Setting = {
  key: string;
  value: boolean;
  label?: string;
  description?: string;
  updated_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_amount: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Championship = {
  id: string;
  name: string;
  description?: string;
  sport_type: string;
  service_id?: string;
  registration_fee: number;
  prize_pool: number;
  first_prize: number;
  second_prize: number;
  third_prize?: number;
  max_participants: number;
  current_participants: number;
  min_team_size: number;
  max_team_size: number;
  format: 'single_elimination' | 'double_elimination' | 'round_robin' | 'league';
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
  banner_image_url?: string;
  rules?: string;
  start_date: string;
  end_date?: string;
  registration_deadline?: string;
  created_at: string;
  updated_at: string;
};

export type ChampionshipParticipant = {
  id: string;
  championship_id: string;
  team_name: string;
  captain_name: string;
  captain_phone: string;
  captain_email?: string;
  members: { name: string; phone: string }[];
  payment_status: 'pending' | 'paid' | 'refunded';
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  seed?: number;
  created_at: string;
  updated_at: string;
};

export type ChampionshipMatch = {
  id: string;
  championship_id: string;
  round: number;
  match_number: number;
  participant1_id?: string;
  participant2_id?: string;
  winner_id?: string;
  loser_id?: string;
  score_p1?: string;
  score_p2?: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  scheduled_time?: string;
  court_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};