-- Migration 010: Championship Management System
-- Creates tables for tournaments, leagues, and competitions

-- 1. Championships table
CREATE TABLE IF NOT EXISTS championships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sport_type VARCHAR(50) NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  registration_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  prize_pool DECIMAL(10,2) NOT NULL DEFAULT 0,
  first_prize DECIMAL(10,2) NOT NULL DEFAULT 0,
  second_prize DECIMAL(10,2) NOT NULL DEFAULT 0,
  third_prize DECIMAL(10,2),
  max_participants INTEGER NOT NULL DEFAULT 16,
  current_participants INTEGER NOT NULL DEFAULT 0,
  min_team_size INTEGER NOT NULL DEFAULT 1,
  max_team_size INTEGER NOT NULL DEFAULT 1,
  format VARCHAR(20) NOT NULL DEFAULT 'single_elimination' CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'league')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')),
  banner_image_url TEXT,
  rules TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  registration_deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Championship participants table
CREATE TABLE IF NOT EXISTS championship_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  team_name VARCHAR(255) NOT NULL,
  captain_name VARCHAR(255) NOT NULL,
  captain_phone VARCHAR(20) NOT NULL,
  captain_email VARCHAR(255),
  members JSONB DEFAULT '[]'::jsonb,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  seed INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Championship matches table (bracket)
CREATE TABLE IF NOT EXISTS championship_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  participant1_id UUID REFERENCES championship_participants(id) ON DELETE SET NULL,
  participant2_id UUID REFERENCES championship_participants(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES championship_participants(id) ON DELETE SET NULL,
  loser_id UUID REFERENCES championship_participants(id) ON DELETE SET NULL,
  score_p1 VARCHAR(50),
  score_p2 VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  scheduled_time TIMESTAMPTZ,
  court_number VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_championships_status ON championships(status);
CREATE INDEX IF NOT EXISTS idx_championships_start_date ON championships(start_date);
CREATE INDEX IF NOT EXISTS idx_championship_participants_championship_id ON championship_participants(championship_id);
CREATE INDEX IF NOT EXISTS idx_championship_participants_payment_status ON championship_participants(payment_status);
CREATE INDEX IF NOT EXISTS idx_championship_participants_phone ON championship_participants(captain_phone);
CREATE INDEX IF NOT EXISTS idx_championship_matches_championship_id ON championship_matches(championship_id);
CREATE INDEX IF NOT EXISTS idx_championship_matches_round ON championship_matches(championship_id, round);

-- Triggers for updated_at
CREATE TRIGGER update_championships_updated_at
  BEFORE UPDATE ON championships FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_championship_participants_updated_at
  BEFORE UPDATE ON championship_participants FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_championship_matches_updated_at
  BEFORE UPDATE ON championship_matches FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();