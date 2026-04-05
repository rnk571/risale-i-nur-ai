import { createClient } from '@supabase/supabase-js'

// Bu değerleri Supabase projenizden alacaksınız
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  // Prod güvenliği: env yoksa uygulama çalışmasın
  throw new Error('Supabase config missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Veritabanı türleri
export interface Book {
  id: string
  title: string
  author: string
  description?: string
  cover_image?: string
  epub_file_path: string
  /** Opsiyonel: açılmış EPUB kökü (META-INF üst dizini). Verilirse epub.js zip indirmeden spine öğelerini ayrı HTTP ile yükler. */
  epub_unpacked_base_url?: string | null
  // Geçiş dönemi: EPUB veya PDF URL'ini tek alanda tutuyoruz
  language?: 'tr' | 'en'
  is_public?: boolean
  created_at: string
  updated_at: string
  is_active: boolean
  // Kitap boyutu (büyük boy / küçük boy)
  book_size?: 'small' | 'large'
  // Sesli kitap alanları (opsiyonel)
  audio_file_path?: string | null
  audio_transcript_path?: string | null
  audio_duration_seconds?: number | null
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