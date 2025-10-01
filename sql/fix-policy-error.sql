-- Quick Fix for Policy Already Exists Error
-- Run this if you get "policy already exists" errors

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all template operations" ON templates;
DROP POLICY IF EXISTS "Allow all region operations" ON regions;
DROP POLICY IF EXISTS "Allow all assignment operations" ON template_assignments;
DROP POLICY IF EXISTS "Allow all template image operations" ON storage.objects;
DROP POLICY IF EXISTS "Allow all company logo operations" ON storage.objects;

-- Recreate policies
CREATE POLICY "Allow all template operations" ON templates FOR ALL USING (true);
CREATE POLICY "Allow all region operations" ON regions FOR ALL USING (true);
CREATE POLICY "Allow all assignment operations" ON template_assignments FOR ALL USING (true);
CREATE POLICY "Allow all template image operations" ON storage.objects FOR ALL USING (bucket_id = 'templates');
CREATE POLICY "Allow all company logo operations" ON storage.objects FOR ALL USING (bucket_id = 'company-logos');

SELECT 'Policy conflicts resolved successfully!' as message;
