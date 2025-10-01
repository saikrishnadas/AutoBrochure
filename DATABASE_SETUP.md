# Database Setup Instructions

## 🗄️ Setting up the Multi-Tenant Database

To use the new multi-tenant features, you need to run the updated SQL schema in your Supabase database.

### Step 1: Access Supabase SQL Editor
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Schema
**Option A: Fresh Installation**
1. Copy the entire contents of `sql/schema.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute the schema

**Option B: Safe Update (if you get policy errors)**
1. Copy the entire contents of `sql/safe-schema-update.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute the safe update

### Step 3: Verify Setup
The schema will create:
- ✅ `companies` table for multi-tenancy
- ✅ Updated `users` table with company relationships
- ✅ Updated `templates` table with company scoping
- ✅ Storage buckets for company logos
- ✅ Clean database (no test data)

### Step 4: Clean Existing Data (Optional)
If you have existing test data you want to remove:
1. Run the `sql/clean-database.sql` script in Supabase SQL Editor
2. This will remove all users, companies, and templates
3. Start fresh with a completely clean database

### Step 5: Create Your First Company
1. Visit the application login page
2. Click "Create Your Company Account"
3. Follow the 3-step onboarding process
4. Start using your clean, multi-tenant application!

## 🚨 Troubleshooting

### Error: "relation 'companies' does not exist"
- **Cause**: The database schema hasn't been run yet
- **Solution**: Follow Step 2 above to run the SQL schema

### Error: "permission denied for table companies"
- **Cause**: Row Level Security policies not properly configured
- **Solution**: The schema includes RLS policies, make sure the entire schema was run

### Error: "bucket 'company-logos' does not exist"
- **Cause**: Storage buckets weren't created
- **Solution**: Re-run the schema, particularly the storage bucket creation section

### Error: "policy already exists"
- **Cause**: Running the schema multiple times creates duplicate policies
- **Solution**: Use `sql/safe-schema-update.sql` instead of `sql/schema.sql`
- **Alternative**: Run the clean database script first, then the schema

## 📋 What the Schema Does

### New Tables
```sql
-- Companies table for multi-tenancy
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  logo_url TEXT,
  logo_path TEXT,
  subscription_status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Updated Tables
```sql
-- Users table with company relationships
ALTER TABLE users ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE users ADD COLUMN email VARCHAR(255);
ALTER TABLE users ADD COLUMN created_by UUID REFERENCES users(id);

-- Templates table with company scoping
ALTER TABLE templates ADD COLUMN company_id UUID REFERENCES companies(id);
```

### Storage Buckets
```sql
-- Company logos storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true);
```

## 🔧 Manual Verification

You can verify the setup by running these queries in the SQL Editor:

```sql
-- Check if companies table exists
SELECT * FROM companies LIMIT 5;

-- Check if users have company relationships
SELECT id, username, role, company_id FROM users LIMIT 5;

-- Check if templates have company scoping
SELECT id, name, company_id FROM templates LIMIT 5;

-- Check storage buckets
SELECT * FROM storage.buckets WHERE id IN ('templates', 'company-logos');
```

## 🎯 Next Steps

Once the database is set up:
1. **Test Demo Accounts**: Use the existing demo credentials
2. **Create New Company**: Try the admin onboarding flow
3. **Manage Users**: Test user creation as an admin
4. **Upload Logo**: Test company logo upload functionality

## 💡 Development Notes

- The schema is designed to be run multiple times safely (uses `IF NOT EXISTS`)
- Existing data is preserved during the migration
- Demo accounts are created automatically for testing
- All new features are backward compatible
