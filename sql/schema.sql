-- Supabase Database Schema for Auto Brochure App (Multi-Tenant SaaS)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table (for multi-tenancy)
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  logo_url TEXT,
  logo_path TEXT,
  subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'trial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (updated for multi-tenancy)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('super_admin', 'admin', 'user')) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates table (updated for multi-tenancy)
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Regions table (stores annotation coordinates)
CREATE TABLE IF NOT EXISTS regions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('image', 'text')) NOT NULL,
  shape VARCHAR(20) CHECK (shape IN ('rectangle', 'polygon')) NOT NULL,
  coordinates JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template assignments table
CREATE TABLE IF NOT EXISTS template_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- Clean database - no test data inserted
-- Use the admin onboarding flow to create your first company and admin

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;

-- DISABLE RLS for users table to avoid infinite recursion
-- In production, you'd want proper authentication with Supabase Auth
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Simplified policies (disable RLS for development)
-- In production, implement proper Supabase Auth integration

-- Templates policies - allow all operations for development
DROP POLICY IF EXISTS "Allow all template operations" ON templates;
CREATE POLICY "Allow all template operations" ON templates FOR ALL USING (true);

-- Regions policies - allow all operations for development  
DROP POLICY IF EXISTS "Allow all region operations" ON regions;
CREATE POLICY "Allow all region operations" ON regions FOR ALL USING (true);

-- Template assignments policies - allow all operations for development
DROP POLICY IF EXISTS "Allow all assignment operations" ON template_assignments;
CREATE POLICY "Allow all assignment operations" ON template_assignments FOR ALL USING (true);

-- Create storage buckets for template images and company logos
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('templates', 'templates', true),
  ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for template images (simplified for development)
DROP POLICY IF EXISTS "Allow all template image operations" ON storage.objects;
CREATE POLICY "Allow all template image operations" ON storage.objects
  FOR ALL USING (bucket_id = 'templates');

-- Storage policies for company logos (simplified for development)
DROP POLICY IF EXISTS "Allow all company logo operations" ON storage.objects;
CREATE POLICY "Allow all company logo operations" ON storage.objects
  FOR ALL USING (bucket_id = 'company-logos');
