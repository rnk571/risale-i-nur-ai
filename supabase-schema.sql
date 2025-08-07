-- Supabase veritabanı şeması
-- Bu SQL komutlarını Supabase SQL Editor'da çalıştırın

-- 1. Users tablosu (auth.users'ı genişletir)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Books tablosu
CREATE TABLE IF NOT EXISTS public.books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    epub_file_path TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. User Book Access tablosu (kullanıcıların hangi kitaplara erişimi olduğu)
CREATE TABLE IF NOT EXISTS public.user_book_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- 4. Reading Progress tablosu (okuma ilerlemesi)
DROP TABLE IF EXISTS public.reading_progress CASCADE;

CREATE TABLE IF NOT EXISTS public.reading_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    current_location TEXT NOT NULL, -- EPUB CFI location
    progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- Row Level Security (RLS) Policies

-- Users tablosu için RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Books tablosu için RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active books" ON public.books
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage books" ON public.books
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- User Book Access tablosu için RLS
ALTER TABLE public.user_book_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own book access" ON public.user_book_access
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all book access" ON public.user_book_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Reading Progress tablosu için RLS
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- Önce mevcut politikaları sil
DROP POLICY IF EXISTS "Users can manage own reading progress" ON public.reading_progress;

-- Yeni politika oluştur
CREATE POLICY "Users can manage own reading progress" ON public.reading_progress
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reading_progress_updated_at BEFORE UPDATE ON public.reading_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for EPUB files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('epub-files', 'epub-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for EPUB files
CREATE POLICY "Public can view EPUB files" ON storage.objects
    FOR SELECT USING (bucket_id = 'epub-files');

CREATE POLICY "Admins can upload EPUB files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'epub-files' 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete EPUB files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'epub-files' 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 5. Bookmarks tablosu (yer işaretleri)
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    location TEXT NOT NULL, -- EPUB CFI location
    note TEXT,
    chapter_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id, location)
);

-- Bookmarks tablosu için RLS
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks
    FOR ALL USING (user_id = auth.uid());

-- Demo data (opsiyonel)
-- Admin kullanıcısı otomatik oluşturulacak (email: admin@demo.com)
-- Demo kitap verisi kaldırıldı - admin panelinden gerçek EPUB dosyaları yükleyebilirsiniz