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

-- auth.users → public.users otomatik senkron (yeni kullanıcı kaydı olduğunda)
CREATE OR REPLACE FUNCTION public.handle_auth_user_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_insert();

-- 1.b Admin kullanıcılar tablosu (RLS kontrolünde rekürsiyonu önlemek için)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS devre dışı: is_admin() fonksiyonu bu tabloyu okuyabilsin (rekürsiyon engellenir)
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- 2. Books tablosu
CREATE TABLE IF NOT EXISTS public.books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    epub_file_path TEXT NOT NULL,
    language TEXT DEFAULT 'tr' CHECK (language IN ('tr','en')),
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mevcut kurulumlar için language sütununu ekle
ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'tr' CHECK (language IN ('tr','en'));

-- Mevcut kurulumlar için herkese erişim sütununu ekle
ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

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

-- Yardımcı fonksiyon: is_admin() - RLS içinde admin kontrolü (rekürsiyonu engeller)
DROP FUNCTION IF EXISTS public.is_admin();
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users a
    WHERE a.id = auth.uid()
  );
$$;

-- Fonksiyon yürütme yetkileri
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Users tablosu için RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları kaldır
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Normal kullanıcılar sadece kendi kaydını görebilsin
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Adminler tüm kullanıcıları görebilsin
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (public.is_admin());

-- Normal kullanıcılar sadece kendi kaydını güncelleyebilsin
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Adminler tüm kullanıcıları yönetebilsin (insert/update/delete)
CREATE POLICY "Admins can manage all users" ON public.users
    FOR ALL USING (public.is_admin());

-- admin_users senkron tetikleyicileri (public.users.role ile eşitle)
CREATE OR REPLACE FUNCTION public.sync_admin_users()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin' THEN
      INSERT INTO public.admin_users (id) VALUES (NEW.id)
      ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role = 'admin' AND (OLD.role IS DISTINCT FROM NEW.role) THEN
      INSERT INTO public.admin_users (id) VALUES (NEW.id)
      ON CONFLICT (id) DO NOTHING;
    ELSIF OLD.role = 'admin' AND NEW.role <> 'admin' THEN
      DELETE FROM public.admin_users WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.admin_users WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS sync_admin_users_insert ON public.users;
DROP TRIGGER IF EXISTS sync_admin_users_update ON public.users;
DROP TRIGGER IF EXISTS sync_admin_users_delete ON public.users;
CREATE TRIGGER sync_admin_users_insert
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users();

CREATE TRIGGER sync_admin_users_update
AFTER UPDATE OF role ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users();

CREATE TRIGGER sync_admin_users_delete
AFTER DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users();

-- Mevcut admin kullanıcıları admin_users tablosuna al
INSERT INTO public.admin_users (id)
SELECT id FROM public.users WHERE role = 'admin'
ON CONFLICT (id) DO NOTHING;

-- Books tablosu için RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Books SELECT: aktif ve (public veya (kullanıcı erişimi var) veya admin)
DROP POLICY IF EXISTS "Everyone can view active books" ON public.books;
CREATE POLICY "Active public or permitted books" ON public.books
    FOR SELECT USING (
        is_active = true AND (
            is_public = true OR
            public.is_admin() OR
            EXISTS (
                SELECT 1 FROM public.user_book_access uba
                WHERE uba.book_id = books.id AND uba.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Only admins can manage books" ON public.books
    FOR ALL USING (public.is_admin());

-- User Book Access tablosu için RLS
ALTER TABLE public.user_book_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own book access" ON public.user_book_access
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all book access" ON public.user_book_access
    FOR ALL USING (public.is_admin());

-- Reading Progress tablosu için RLS
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- Önce mevcut politikaları sil
DROP POLICY IF EXISTS "Users can manage own reading progress" ON public.reading_progress;

-- Yeni politika oluştur
CREATE POLICY "Users can manage own reading progress" ON public.reading_progress
    FOR ALL USING (
        user_id = auth.uid() OR public.is_admin()
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
        bucket_id = 'epub-files' AND public.is_admin()
    );
-- Storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pdf-files', 'pdf-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for PDF files
CREATE POLICY "Public can view PDF files" ON storage.objects
    FOR SELECT USING (bucket_id = 'pdf-files');

CREATE POLICY "Admins can upload PDF files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'pdf-files' AND public.is_admin()
    );

CREATE POLICY "Admins can delete PDF files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'pdf-files' AND public.is_admin()
    );

CREATE POLICY "Admins can delete EPUB files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'epub-files' AND public.is_admin()
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