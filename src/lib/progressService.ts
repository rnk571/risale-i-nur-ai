import { supabase } from './supabase'

export interface ReadingProgress {
  id: string
  user_id: string
  book_id: string
  current_location: string
  progress_percentage: number
  last_read_at: string
  created_at: string
  updated_at: string
}

export interface Bookmark {
  id: string
  user_id: string
  book_id: string
  location: string
  note?: string
  chapter_title?: string
  created_at: string
}

// Okuma ilerlemesini kaydet
export const saveReadingProgress = async (
  userId: string,
  bookId: string,
  location: string,
  progressPercentage: number
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('reading_progress')
      .upsert({
        user_id: userId,
        book_id: bookId,
        current_location: location,
        progress_percentage: progressPercentage,
        last_read_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,book_id'
      })

    if (error) {
      // Tablo bulunamadı veya RLS hatası varsa sessizce geç
      if (error.code === '42P01' || 
          error.code === '406' ||
          error.message.includes('relation "public.reading_progress" does not exist') ||
          error.message.includes('Not Acceptable')) {
        console.warn('reading_progress tablosu bulunamadı veya erişim izni yok, ilerleme kaydedilemiyor')
        return
      }
      throw error
    }
  } catch (error) {
    console.error('Okuma ilerlemesi kaydetme hatası:', error)
  }
}

// Okuma ilerlemesini getir
export const getReadingProgress = async (
  userId: string,
  bookId: string
): Promise<ReadingProgress | null> => {
  try {
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .single()

    if (error) {
      // PGRST116 = 0 rows (henüz okuma ilerlemesi yok) - bu normal bir durum
      if (error.code === 'PGRST116') {
        return null
      }
      
      // Diğer hatalar için kontrol
      if (error.code === '42P01' || 
          error.code === '406' ||
          error.message.includes('relation "public.reading_progress" does not exist') ||
          error.message.includes('Not Acceptable')) {
        console.warn('reading_progress tablosu bulunamadı veya erişim izni yok')
        return null
      }
      
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Okuma ilerlemesi getirme hatası:', error)
    return null
  }
}

// Kullanıcının tüm okuma ilerlemelerini getir
export const getUserReadingProgress = async (
  userId: string
): Promise<ReadingProgress[]> => {
  try {
    const { data, error } = await supabase
      .from('reading_progress')
      .select(`
        *,
        books:book_id (
          id,
          title,
          author,
          cover_image
        )
      `)
      .eq('user_id', userId)
      .order('last_read_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Kullanıcı okuma ilerlemeleri getirme hatası:', error)
    return []
  }
}

// Bookmark ekle
export const addBookmark = async (
  userId: string,
  bookId: string,
  location: string,
  note?: string,
  chapterTitle?: string
): Promise<string | null> => {
  try {
    // Manuel UUID oluştur
    const bookmarkId = crypto.randomUUID()
    
    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        id: bookmarkId,
        user_id: userId,
        book_id: bookId,
        location,
        note,
        chapter_title: chapterTitle
      })
      .select('id')
      .single()

    if (error) {
      // Tablo bulunamadı hatası varsa sessizce geç
      if (error.code === '42P01' || error.message.includes('relation "public.bookmarks" does not exist')) {
        console.warn('bookmarks tablosu bulunamadı')
        return null
      }
      throw error
    }
    console.log('Bookmark eklendi:', data.id)
    return data.id
  } catch (error) {
    console.error('Bookmark ekleme hatası:', error)
    return null
  }
}

// Bookmark'ları getir
export const getBookmarks = async (
  userId: string,
  bookId: string
): Promise<Bookmark[]> => {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })

    if (error) {
      // Tablo bulunamadı hatası varsa sessizce geç
      if (error.code === '42P01' || error.message.includes('relation "public.bookmarks" does not exist')) {
        console.warn('bookmarks tablosu bulunamadı')
        return []
      }
      throw error
    }
    return data || []
  } catch (error) {
    console.error('Bookmarkları getirme hatası:', error)
    return []
  }
}

// Bookmark sil
export const deleteBookmark = async (bookmarkId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', bookmarkId)

    if (error) {
      // Tablo bulunamadı hatası varsa sessizce geç
      if (error.code === '42P01' || error.message.includes('relation "public.bookmarks" does not exist')) {
        console.warn('bookmarks tablosu bulunamadı')
        return false
      }
      throw error
    }
    console.log('Bookmark silindi:', bookmarkId)
    return true
  } catch (error) {
    console.error('Bookmark silme hatası:', error)
    return false
  }
}