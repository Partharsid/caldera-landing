-- Create a public bucket for service images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any to prevent "already exists" errors when re-running
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can update their images" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete images" ON storage.objects;

-- Set up storage policies for public access (Read)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'service-images' );

-- Set up storage policies for access (Insert)
-- Since the Admin UI is protected by Next.js middleware and not Supabase Auth,
-- we allow anon inserts to this specific bucket.
CREATE POLICY "Admin users can upload images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'service-images' );

-- Set up storage policies for access (Update)
CREATE POLICY "Admin users can update their images"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'service-images' );

-- Set up storage policies for access (Delete)
CREATE POLICY "Admin users can delete images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'service-images' );
