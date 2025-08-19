-- Highlights tablosunu oluştur
-- Bu SQL komutlarını Supabase SQL Editor'da çalıştırın

-- 6. Highlights tablosu (metin vurgulamaları)
CREATE TABLE IF NOT EXISTS public.highlights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    cfi_range TEXT NOT NULL, -- EPUB CFI range (başlangıç ve bitiş konumları)
    selected_text TEXT NOT NULL, -- Vurgulanan metin
    note TEXT, -- Kullanıcının eklediği not (opsiyonel)
    color TEXT DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'pink', 'red', 'purple')),
    chapter_title TEXT, -- Hangi bölümde olduğu
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id, cfi_range)
);

-- Highlights tablosu için RLS
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi highlight'larını yönetebilir
CREATE POLICY "Users can manage own highlights" ON public.highlights
    FOR ALL USING (user_id = auth.uid());

-- Adminler tüm highlight'ları görebilir (opsiyonel)
CREATE POLICY "Admins can view all highlights" ON public.highlights
    FOR SELECT USING (public.is_admin());

-- Updated_at trigger'ı ekle
CREATE TRIGGER update_highlights_updated_at 
    BEFORE UPDATE ON public.highlights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index'ler performans için
CREATE INDEX IF NOT EXISTS idx_highlights_user_book ON public.highlights(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_highlights_created_at ON public.highlights(created_at);
