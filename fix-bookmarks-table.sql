-- Bookmarks tablosunu düzelt
-- Önce mevcut tabloyu sil (eğer varsa)
DROP TABLE IF EXISTS public.bookmarks;

-- Yeni tabloyu oluştur
CREATE TABLE public.bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    location TEXT NOT NULL,
    note TEXT,
    chapter_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id, location)
);

-- RLS'yi etkinleştir
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS politikası ekle
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks
    FOR ALL USING (user_id = auth.uid());

-- Test verisi ekle (opsiyonel)
-- INSERT INTO public.bookmarks (user_id, book_id, location, note) 
-- VALUES ('your-user-id', 'your-book-id', 'epubcfi(/6/4[chapter-1]!/4/2/1:0)', 'Test bookmark'); 