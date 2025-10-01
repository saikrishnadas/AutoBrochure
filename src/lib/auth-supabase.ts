import { supabase } from './supabase'

export interface Company {
  id: string
  name: string
  logo_url?: string
  logo_path?: string
  subscription_status: 'active' | 'inactive' | 'trial'
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  username: string
  role: 'super_admin' | 'admin' | 'user'
  name: string
  email?: string
  company_id?: string
  company?: Company
  created_by?: string | null
  created_at: string
  updated_at: string
}

// Authenticate user with Supabase
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  try {
    console.log('🔍 Attempting authentication for:', username)
    
    // First check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ Supabase environment variables not set')
      return null
    }

    const { data, error } = await supabase
      .from('users')
      .select(`
        id, username, role, name, email, company_id, created_by, created_at, updated_at,
        company:companies(id, name, logo_url, logo_path, subscription_status, created_at, updated_at)
      `)
      .eq('username', username)
      .eq('password_hash', password) // In production, use proper password hashing
      .single()

    console.log('🔍 Supabase response:', { data, error })

    if (error) {
      console.error('❌ Authentication error:', error.message, error.details, error.hint)
      return null
    }

    if (!data) {
      console.error('❌ No user found with these credentials')
      return null
    }

    console.log('✅ Authentication successful:', data)
    return data
  } catch (error) {
    console.error('❌ Authentication exception:', error)
    return null
  }
}

// Get user by ID
export async function getUserById(id: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, username, role, name, email, company_id, created_by, created_at, updated_at,
        company:companies(id, name, logo_url, logo_path, subscription_status, created_at, updated_at)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

// Get all users for a company (admin only)
export async function getAllUsers(companyId?: string): Promise<User[]> {
  try {
    let query = supabase
      .from('users')
      .select(`
        id, username, role, name, email, company_id, created_by, created_at, updated_at,
        company:companies(id, name, logo_url, logo_path, subscription_status, created_at, updated_at)
      `)
      .eq('role', 'user')

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Get users error:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Get users error:', error)
    return []
  }
}

// Session management (same as before)
export function setCurrentUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentUser', JSON.stringify(user))
  }
}

export function getCurrentUser(): User | null {
  // Only access localStorage on client side to avoid hydration mismatch
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser')
      return stored ? JSON.parse(stored) : null
    }
  } catch (error) {
    console.error('Error getting current user:', error)
  }
  return null
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentUser')
  }
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin'
}

export function isUser(user: User | null): boolean {
  return user?.role === 'user'
}

export function isSuperAdmin(user: User | null): boolean {
  return user?.role === 'super_admin'
}

// Test if companies table exists
export async function testCompaniesTable(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Companies table test error:', error)
      return false
    }

    console.log('✅ Companies table exists and is accessible')
    return true
  } catch (error) {
    console.error('Companies table test exception:', error)
    return false
  }
}

// Test if users table has been updated with new columns
export async function testUsersTableSchema(): Promise<boolean> {
  try {
    // Try to select the new columns
    const { data, error } = await supabase
      .from('users')
      .select('id, email, company_id, created_by, updated_at')
      .limit(1)

    if (error) {
      console.error('Users table schema test error:', error)
      console.error('Missing columns. Please run the database schema update.')
      return false
    }

    console.log('✅ Users table has been updated with new columns')
    return true
  } catch (error) {
    console.error('Users table schema test exception:', error)
    return false
  }
}

// Company management functions
export async function createCompany(companyData: {
  name: string
  logo_url?: string
  logo_path?: string
}): Promise<Company | null> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .insert([{
        name: companyData.name,
        logo_url: companyData.logo_url,
        logo_path: companyData.logo_path,
        subscription_status: 'trial'
      }])
      .select()
      .single()

    if (error) {
      console.error('Create company error:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return null
    }

    return data
  } catch (error) {
    console.error('Create company error:', error)
    return null
  }
}

export async function uploadCompanyLogo(file: File, companyName: string): Promise<{url: string, path: string} | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`
    const filePath = `logos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Logo upload error:', uploadError)
      return null
    }

    const { data } = supabase.storage
      .from('company-logos')
      .getPublicUrl(filePath)

    return {
      url: data.publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('Logo upload error:', error)
    return null
  }
}

// User creation function for admins
export async function createUser(userData: {
  username: string
  password: string
  name: string
  email?: string
  role: 'admin' | 'user'
  company_id: string
  created_by: string | null
}): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        username: userData.username,
        password_hash: userData.password, // In production, hash this properly
        name: userData.name,
        email: userData.email,
        role: userData.role,
        company_id: userData.company_id,
        created_by: userData.created_by
      }])
      .select(`
        id, username, role, name, email, company_id, created_by, created_at, updated_at,
        company:companies(id, name, logo_url, logo_path, subscription_status, created_at, updated_at)
      `)
      .single()

    if (error) {
      console.error('Create user error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Create user error:', error)
    return null
  }
}

// Test Supabase connection and list all users (for debugging)
export async function testSupabaseConnection(): Promise<void> {
  try {
    console.log('🔍 Testing Supabase connection...')
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
    
    console.log('🔍 All users in database:', { data, error })
  } catch (error) {
    console.error('❌ Connection test failed:', error)
  }
}
