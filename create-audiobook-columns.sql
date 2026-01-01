-- Sesli kitap için ek alanlar ve storage bucket'ları
-- Bu dosyayı Supabase SQL Editor'da bir defa çalıştırmanız yeterlidir.

-- 1) Books tablosuna sesli kitap alanlarını ekle
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS audio_file_path TEXT;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS audio_transcript_path TEXT;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER;

-- 2) Ses dosyaları için storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Transkript JSON dosyaları için storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('transcript-files', 'transcript-files', true)
ON CONFLICT (id) DO NOTHING;

-- 4) Storage policy'leri
-- Audio files
CREATE POLICY "Public can listen audio files" ON storage.objects
  FOR SELECT USING (bucket_id = 'audio-files');

CREATE POLICY "Admins can upload audio files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio-files' AND public.is_admin()
  );

CREATE POLICY "Admins can delete audio files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'audio-files' AND public.is_admin()
  );

-- Transcript JSON files
CREATE POLICY "Public can view transcript files" ON storage.objects
  FOR SELECT USING (bucket_id = 'transcript-files');

CREATE POLICY "Admins can upload transcript files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'transcript-files' AND public.is_admin()
  );

CREATE POLICY "Admins can delete transcript files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'transcript-files' AND public.is_admin()
  );


