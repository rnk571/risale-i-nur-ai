# 📚 Elektronik Kitap Okuyucu

Modern, responsive ve kullanıcı dostu bir e-kitap okuyucu web uygulaması. React, TypeScript, Tailwind CSS ve Supabase kullanılarak geliştirilmiştir.

![Demo](https://img.shields.io/badge/Status-Ready-brightgreen)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3.3.0-38B2AC)
![Supabase](https://img.shields.io/badge/Supabase-Latest-green)

## ✨ Özellikler

### 🎨 **Modern UI/UX**

- **Glassmorphism** tasarım dili
- **Dark/Light Mode** desteği
- **Responsive** tasarım (mobil uyumlu)
- **Smooth animasyonlar** ve geçişler
- **Professional** görünüm

### 📚 **Kitap Yönetimi**

- **EPUB formatı** desteği
- **Kitap kütüphanesi** görünümü
- **Arama ve filtreleme**
- **Kitap detayları** (başlık, yazar, açıklama)
- **Kapak resmi** desteği

### 👥 **Kullanıcı Sistemi**

- **Admin/Kullanıcı** rol sistemi
- **Güvenli authentication** (Supabase Auth)
- **Kullanıcı bazlı** kitap erişimi
- **Oturum yönetimi**

### 📖 **Okuma Deneyimi**

- **Profesyonel EPUB reader**
- **Okuma ilerlemesi** takibi
- **Yer işaretleri** (bookmarks) **+ Not ekleme özelliği**
- **Tema seçenekleri** (açık, koyu, sepia)
- **Font boyutu** ayarlama
- **Sayfa navigasyonu**

### ⚙️ **Admin Paneli**

- **Kitap ekleme/düzenleme/silme**
- **Kullanıcı erişim** yönetimi
- **Kitap durumu** kontrolü
- **Toplu kullanıcı** atama

### 🌙 **Dark Mode**

- **Otomatik sistem** tercihi algılama
- **Manuel tema** değiştirme
- **LocalStorage** ile tercih kaydetme
- **Smooth geçişler**

### 🔖 **Bookmark Not Sistemi**

- **Özel notlar** ekleme
- **Otomatik sayfa bilgisi** (not yazmasanız bile)
- **Modern modal** arayüzü
- **EPUB ve PDF** desteği
- **Çok dilli** arayüz

## 📖 Kullanım

### Bookmark Not Ekleme

1. **Kitabı açın** ve okumaya başlayın
2. **Bookmark butonuna** tıklayın (🔖)
3. **"Yer İşaretine Not Ekle"** modalı açılacak
4. **Notunuzu yazın** (opsiyonel)
5. **"Kaydet"** butonuna tıklayın

**Özellikler:**
- Not yazmasanız bile sayfa bilgileri otomatik eklenir
- Bookmark listesinde notlarınız tırnak işareti içinde görünür
- Hem EPUB hem PDF formatlarında çalışır

### Diğer Özellikler

- **Tema değiştirme**: Sağ üst köşedeki güneş/ay ikonuna tıklayın
- **Font boyutu**: Ayarlar panelinden font boyutunu ayarlayın
- **Tam ekran**: Mobilde tam ekran butonuna tıklayın

## 🚀 Kurulum

### Gereksinimler

- Node.js 18+
- npm veya yarn
- Supabase hesabı

### 1. Projeyi Klonlayın

```bash
git clone https://github.com/kullaniciadi/elektronik-kitap-okuyucu.git
cd elektronik-kitap-okuyucu
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Environment Variables

`.env` dosyası oluşturun:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Supabase Kurulumu

#### Database Schema

```sql
-- Users tablosu (Supabase Auth ile otomatik oluşur)
-- Ek rol sütunu ekleyin:
ALTER TABLE auth.users ADD COLUMN role TEXT DEFAULT 'user';

-- Books tablosu
CREATE TABLE books (
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

-- User book access tablosu
CREATE TABLE user_book_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Reading progress tablosu
CREATE TABLE reading_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  current_location TEXT NOT NULL,
  progress_percentage INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Bookmarks tablosu
CREATE TABLE bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Row Level Security (RLS)

```sql
-- Books için RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Admin tüm kitapları görebilir
CREATE POLICY "Admin can view all books" ON books
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- Admin kitap ekleyebilir/düzenleyebilir
CREATE POLICY "Admin can manage books" ON books
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- User book access için RLS
ALTER TABLE user_book_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their access" ON user_book_access
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admin can manage access" ON user_book_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- Reading progress için RLS
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their progress" ON reading_progress
  FOR ALL USING (user_id = auth.uid());

-- Bookmarks için RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their bookmarks" ON bookmarks
  FOR ALL USING (user_id = auth.uid());
```

### 5. Development Server'ı Başlatın

```bash
npm run dev
```

Uygulama `http://localhost:5173` adresinde çalışacaktır.

## 📱 Kullanım

### Demo Hesap

- **Email**: admin@demo.com
- **Şifre**: admin123

### Admin Paneli

1. Demo hesabı ile giriş yapın
2. Header'daki "Admin Paneli" butonuna tıklayın
3. Kitap ekleyin ve kullanıcılara erişim verin

### Kitap Okuma

1. Kütüphaneden bir kitap seçin
2. Okuma ayarlarını özelleştirin
3. Yer işaretleri ekleyin
4. İlerlemeniz otomatik kaydedilir

## 🛠️ Teknolojiler

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **React Router** - Navigation
- **Lucide React** - Icons

### Backend & Database

- **Supabase** - Backend as a Service
- **PostgreSQL** - Database
- **Row Level Security** - Data protection
- **Supabase Auth** - Authentication
- **Supabase Storage** - File storage

### EPUB Reading

- **react-reader** - EPUB rendering
- **epub.js** - EPUB parsing

## 📁 Proje Yapısı

```
src/
├── components/          # React bileşenleri
│   ├── Auth.tsx        # Giriş/kayıt sayfası
│   ├── BookLibrary.tsx # Kitap kütüphanesi
│   ├── EpubReader.tsx  # EPUB okuyucu
│   └── AdminPanel.tsx  # Admin paneli
├── hooks/              # Custom React hooks
│   └── useDarkMode.ts  # Dark mode hook
├── lib/                # Utility fonksiyonları
│   ├── supabase.ts     # Supabase client
│   └── progressService.ts # Okuma ilerlemesi
├── App.tsx             # Ana uygulama
└── index.css           # Global stiller
```

## 🎨 Özelleştirme

### Dark Mode

```typescript
// useDarkMode hook kullanımı
const { isDarkMode, toggleDarkMode } = useDarkMode();
```

### Yeni Tema Ekleme

```css
/* tailwind.config.js */
theme: {
  extend: {
    colors: {
      "custom": {
        50: "#f0f9ff";
        // ... diğer tonlar
      }
    }
  }
}
```

## 🚀 Deployment

### Vercel

```bash
npm run build
vercel --prod
```

### Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🙏 Teşekkürler

- [Supabase](https://supabase.com) - Backend servisleri
- [Tailwind CSS](https://tailwindcss.com) - CSS framework
- [React](https://reactjs.org) - UI library
- [Lucide](https://lucide.dev) - Icon library

## 📞 İletişim

- **GitHub**: [@kullaniciadi](https://github.com/kullaniciadi)
- **Email**: ornek@email.com

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!
# risale-i-nur-ai
