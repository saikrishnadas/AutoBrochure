# 🔧 Troubleshooting Guide

Common errors and their solutions for the Auto Brochure multi-tenant application.

## 🗄️ Database Errors

### Error: "relation 'companies' does not exist"
**Cause**: Database schema hasn't been run yet.
**Solution**: 
1. Run `sql/schema.sql` in Supabase SQL Editor
2. Or use `sql/safe-schema-update.sql` for existing databases

### Error: "Could not find the 'email' column of 'users'"
**Cause**: Users table missing new multi-tenant columns.
**Solution**: 
1. Run `sql/add-user-columns.sql` for quick fix
2. Or run `sql/safe-schema-update.sql` for complete update

### Error: "policy already exists"
**Cause**: Running schema multiple times creates duplicate policies.
**Solution**: 
1. Run `sql/fix-policy-error.sql` to resolve conflicts
2. Or use `sql/safe-schema-update.sql` which handles this automatically

### Error: "invalid input syntax for type uuid: ''"
**Cause**: Empty string passed where UUID expected.
**Solution**: 
- ✅ **Fixed in latest code** - `created_by` now uses `null` instead of empty string
- Update your code if you see this error elsewhere

## 🚀 Application Errors

### Error: "Database not properly configured"
**Cause**: Missing tables or columns in database.
**Solution**: 
1. Use the in-app database setup helper
2. Follow the guided setup process
3. Run the recommended SQL scripts

### Error: "Create company error: {}"
**Cause**: Usually missing `companies` table.
**Solution**: 
1. Check browser console for detailed error
2. Run `sql/safe-schema-update.sql`
3. Ensure Supabase environment variables are set

### Error: "Create user error: {}"
**Cause**: Usually missing columns in `users` table.
**Solution**: 
1. Run `sql/add-user-columns.sql`
2. Check that `company_id` exists and is valid
3. Ensure `created_by` is either a valid UUID or `null`

## 🔐 Authentication Issues

### Cannot login with demo accounts
**Cause**: Demo accounts removed in clean version.
**Solution**: 
- Use the "Create Your Company Account" onboarding flow
- This is the intended behavior for production use

### "Invalid username or password"
**Cause**: User doesn't exist or wrong credentials.
**Solution**: 
1. For clean database: Use onboarding to create first admin
2. Check Supabase dashboard for existing users
3. Verify password matches what was set during creation

## 🎨 UI/UX Issues

### Company logo not showing
**Cause**: Logo upload failed or storage bucket missing.
**Solution**: 
1. Check that `company-logos` storage bucket exists
2. Verify storage policies are set correctly
3. Re-upload logo through admin settings

### Navigation shows "Auto Brochure" instead of company name
**Cause**: User not properly associated with company.
**Solution**: 
1. Check that user has valid `company_id`
2. Verify company exists in database
3. Re-login to refresh user data

## 📊 Performance Issues

### Slow page loads
**Cause**: Database queries or large images.
**Solution**: 
1. Optimize images before upload
2. Check Supabase performance metrics
3. Review database indexes if needed

### Template upload fails
**Cause**: File size or storage issues.
**Solution**: 
1. Ensure file is under size limit (5MB for logos)
2. Check storage bucket permissions
3. Verify file format is supported

## 🛠️ Development Issues

### TypeScript errors after updates
**Cause**: Interface changes in multi-tenant update.
**Solution**: 
1. Update imports to use new interfaces
2. Handle `null` values for optional fields
3. Check that `User` and `Company` interfaces match usage

### Build errors
**Cause**: Missing dependencies or configuration.
**Solution**: 
1. Run `npm install` to update dependencies
2. Check that all environment variables are set
3. Clear Next.js cache: `rm -rf .next`

## 🔍 Debugging Tips

### Check Browser Console
Always check the browser console for detailed error messages:
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for red error messages
4. Check Network tab for failed requests

### Check Supabase Logs
1. Go to Supabase Dashboard
2. Navigate to Logs section
3. Look for recent errors
4. Check API and Database logs

### Verify Environment Variables
Ensure these are set in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📞 Getting Help

### Quick Fixes Available
- `sql/fix-policy-error.sql` - Fix policy conflicts
- `sql/add-user-columns.sql` - Add missing user columns
- `sql/clean-database.sql` - Start completely fresh
- `sql/safe-schema-update.sql` - Complete safe update

### Documentation
- `DATABASE_SETUP.md` - Database setup instructions
- `MULTI_TENANT_FEATURES.md` - Feature documentation
- `CLEAN_START_GUIDE.md` - Clean database guide

### Common Solutions
1. **Most database errors**: Run `sql/safe-schema-update.sql`
2. **Policy conflicts**: Run `sql/fix-policy-error.sql`
3. **Missing columns**: Run `sql/add-user-columns.sql`
4. **Start fresh**: Run `sql/clean-database.sql` then `sql/schema.sql`

Remember: The application includes built-in error detection and will guide you to the right solution in most cases!
