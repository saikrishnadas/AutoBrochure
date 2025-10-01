# Auto Brochure - Supabase Setup Guide

## 🚀 Quick Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Wait for the project to be ready (2-3 minutes)

### 2. Get Your Credentials
1. Go to Project Settings → API
2. Copy your project URL and anon key

### 3. Set Environment Variables
Create `.env.local` in your project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Database Schema
1. Go to your Supabase dashboard → SQL Editor
2. Copy and paste the contents of `sql/schema.sql`
3. Click "Run" to create tables and policies

### 5. Start the App
```bash
npm run dev
```

## 🎯 Test Login Credentials

**Admin:**
- Username: `admin`
- Password: `adminsayshello`

**Users:**
- Username: `user1`, Password: `userhello1`
- Username: `user2`, Password: `userhello2`

## 🗂️ Database Structure

### Tables Created:
- `users` - User accounts and roles
- `templates` - Template metadata and image URLs
- `regions` - Annotation coordinates (rectangles/polygons)
- `template_assignments` - User-template assignments

### Storage Bucket:
- `templates` - Stores uploaded template images

## 🔒 Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Storage policies** for secure image uploads
- **Role-based access control** (admin/user permissions)

## 📁 What's Stored Where

### Supabase Database:
- User accounts and authentication
- Template metadata (name, created_by, etc.)
- Annotation coordinates (x, y, width, height, points)
- Template-to-user assignments

### Supabase Storage:
- Original template images (PNG/JPG)
- Automatic CDN distribution
- Public URLs for fast loading

## 🔧 Development vs Production

**Development:**
- Uses hardcoded passwords (simple auth)
- Free Supabase tier (500MB DB + 1GB storage)

**Production Ready:**
- Add proper password hashing
- Implement email verification
- Add user registration flow
- Set up proper authentication

## 🚨 Troubleshooting

**Environment Variables:**
- Make sure `.env.local` exists and has correct values
- Restart dev server after adding env variables

**Database Connection:**
- Check Supabase project is active
- Verify URL and key are correct
- Run schema.sql if tables don't exist

**Upload Issues:**
- Check storage bucket exists (`templates`)
- Verify storage policies are applied
- Check file size limits (50MB max on free tier)

## 🎉 Ready to Use!

Your app now has:
✅ **Persistent storage** - All data saved to Supabase
✅ **Image hosting** - Templates stored in Supabase Storage  
✅ **User management** - Role-based access control
✅ **Scalable architecture** - Ready for production use

Login as admin to create templates, then login as user to customize them!
