-- Add image_url column to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Insert extracted services
INSERT INTO services (id, name, type, base_price, peak_price, is_active, image_url)
VALUES 
  (gen_random_uuid(), 'Air Hockey', 'table', 100, 100, true, '/services/air_hockey.jpg'),
  (gen_random_uuid(), 'Beach Volleyball', 'court', 400, 400, true, '/services/beach_volleyball.jpg'),
  (gen_random_uuid(), 'Carroms', 'table', 80, 80, true, '/services/carroms.jpg'),
  (gen_random_uuid(), 'Cricket Nets Machine Balled', 'machine', 350, 350, true, '/services/cricket_nets.jpg'),
  (gen_random_uuid(), 'Oculus VR Game', 'machine', 200, 200, true, '/services/vr_game.jpg'),
  (gen_random_uuid(), 'Pickleball', 'court', 250, 250, true, '/services/pickleball.jpg'),
  (gen_random_uuid(), 'Table Tennis', 'table', 100, 100, true, '/services/table_tennis.jpg');
