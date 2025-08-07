-- Reading Progress Tablosunu Düzelt
-- Bu SQL komutlarını Supabase SQL Editor'da çalıştırın

-- 1. Mevcut tabloyu sil
DROP TABLE IF EXISTS public.reading_progress CASCADE;

-- 2. Yeni tabloyu oluştur
CREATE TABLE public.reading_progress (
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

-- 3. RLS'yi etkinleştir
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- 4. Mevcut politikaları sil
DROP POLICY IF EXISTS "Users can manage own reading progress" ON public.reading_progress;

-- 5. Yeni politika oluştur
CREATE POLICY "Users can manage own reading progress" ON public.reading_progress
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 6. Trigger oluştur
CREATE TRIGGER update_reading_progress_updated_at 
    BEFORE UPDATE ON public.reading_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Tabloyu kontrol et
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'reading_progress';
