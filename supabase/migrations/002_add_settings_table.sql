-- Create settings table for global admin toggles
CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB        NOT NULL DEFAULT 'false',
  label      VARCHAR(255),
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default toggle settings
INSERT INTO settings (key, value, label, description) VALUES
  ('force_peak_pricing',       'false', 'Force Peak Pricing Today',    'Override auto-detection and charge peak rates all day regardless of time'),
  ('disable_online_bookings',  'false', 'Disable Online Bookings',     'Prevent customers from making new online slot bookings'),
  ('maintenance_mode',         'false', 'Maintenance Mode',            'Display a maintenance banner on all public-facing pages'),
  ('allow_walk_in_only',       'false', 'Walk-in Only Mode',           'Disable all online payment options; accept cash walk-ins only')
ON CONFLICT (key) DO NOTHING;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();
