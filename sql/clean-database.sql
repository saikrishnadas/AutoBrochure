-- Clean Database Script
-- This script removes all existing data and resets the database to a clean state
-- Run this in your Supabase SQL Editor to start fresh

-- WARNING: This will delete ALL data in your database
-- Make sure you want to start completely fresh before running this

-- Disable foreign key checks temporarily (if needed)
SET session_replication_role = replica;

-- Delete all data from tables (in correct order to respect foreign keys)
DELETE FROM template_assignments;
DELETE FROM regions;
DELETE FROM templates;
DELETE FROM users;
DELETE FROM companies;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences (if using serial columns)
-- Note: UUIDs don't need sequence resets

-- Clear storage buckets (optional - removes uploaded files)
-- Uncomment the lines below if you want to delete uploaded files too
-- DELETE FROM storage.objects WHERE bucket_id = 'templates';
-- DELETE FROM storage.objects WHERE bucket_id = 'company-logos';

-- Success message
SELECT 'Database cleaned successfully! All users, companies, and templates have been removed.' as message;
