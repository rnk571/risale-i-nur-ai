import { createClient } from '@supabase/supabase-js'

// Bu değerleri Supabase projenizden alacaksınız
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Veritabanı türleri
export interface Book {
  id: string
  title: string
  author: string
  description?: string
  cover_image?: string
  epub_file_path: string
  language?: 'tr' | 'en'
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}

export interface UserBookAccess {
  id: string
  user_id: string
  book_id: string
  granted_at: string
}