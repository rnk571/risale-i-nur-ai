-- Reading Progress RLS Politikasını Düzelt
-- Bu SQL komutlarını Supabase SQL Editor'da çalıştırın

-- Önce mevcut politikayı sil
DROP POLICY IF EXISTS "Users can manage own reading progress" ON public.reading_progress;

-- Yeni politikayı oluştur (admin kullanıcılar da erişebilsin)
CREATE POLICY "Users can manage own reading progress" ON public.reading_progress
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Politikayı kontrol et
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
