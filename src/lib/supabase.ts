import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface User {
  id: string
  username: string
  password_hash: string
  role: 'admin' | 'user'
  name: string
  created_at: string
}

export interface Template {
  id: string
  name: string
  image_url: string
  image_path: string
  created_by: string
  created_at: string
}

export interface Region {
  id: string
  template_id: string
  type: 'image' | 'text'
  shape: 'rectangle' | 'polygon'
  coordinates: {
    x?: number
    y?: number
    width?: number
    height?: number
    points?: { x: number; y: number }[]
  }
  created_at: string
}

export interface TemplateAssignment {
  id: string
  template_id: string
  user_id: string
  assigned_at: string
}
