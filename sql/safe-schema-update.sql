-- Safe Schema Update Script
-- This script can be run multiple times without errors
-- It handles existing tables, columns, and policies gracefully

-- Enable UUID extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table (safe creation)
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  logo_url TEXT,
  logo_path TEXT,
  subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'trial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to users table (safe additions)
DO $$ 
BEGIN
  -- Add company_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='company_id') THEN
    ALTER TABLE users ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  
  -- Add email column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email') THEN
    ALTER TABLE users ADD COLUMN email VARCHAR(255);
  END IF;
  
  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='created_by') THEN
    ALTER TABLE users ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Update users table role constraint to include super_admin
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='users_role_check' AND table_name='users') THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
  
  -- Add updated constraint
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'user'));
END $$;

-- Add company_id to templates table
DO $$ 
BEGIN
  -- Add company_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='templates' AND column_name='company_id') THEN
    ALTER TABLE templates ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create other tables if they don't exist
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('image', 'text')) NOT NULL,
  shape VARCHAR(20) CHECK (shape IN ('rectangle', 'polygon')) NOT NULL,
  coordinates JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- Enable RLS (safe to run multiple times)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (safe approach)
DROP POLICY IF EXISTS "Allow all template operations" ON templates;
CREATE POLICY "Allow all template operations" ON templates FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all region operations" ON regions;
CREATE POLICY "Allow all region operations" ON regions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all assignment operations" ON template_assignments;
CREATE POLICY "Allow all assignment operations" ON template_assignments FOR ALL USING (true);

-- Create storage buckets (safe with conflict handling)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('templates', 'templates', true),
  ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop and recreate storage policies (safe approach)
DROP POLICY IF EXISTS "Allow all template image operations" ON storage.objects;
CREATE POLICY "Allow all template image operations" ON storage.objects
  FOR ALL USING (bucket_id = 'templates');

DROP POLICY IF EXISTS "Allow all company logo operations" ON storage.objects;
CREATE POLICY "Allow all company logo operations" ON storage.objects
  FOR ALL USING (bucket_id = 'company-logos');

-- Success message
SELECT 'Schema updated successfully! Database is ready for multi-tenant use.' as message;
