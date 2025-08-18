# Bookmark Not Ekleme Özelliği

Bu özellik, elektronik kitap okuyucu uygulamasında bookmark'lara (yer işaretleri) not eklemenizi sağlar.

## Özellikler

- **Not Ekleme**: Bookmark eklerken özel notlar yazabilirsiniz
- **Otomatik Bilgi**: Not yazmasanız bile sayfa ve yüzde bilgileri otomatik eklenir
- **Görsel Arayüz**: Modern ve kullanıcı dostu modal tasarım
- **Çok Dilli Destek**: Türkçe ve İngilizce dil desteği
- **EPUB ve PDF Desteği**: Her iki format için de çalışır

## Nasıl Kullanılır

### 1. Bookmark Ekleme
1. Kitabı okurken bookmark butonuna tıklayın
2. "Yer İşaretine Not Ekle" modalı açılacak
3. İsteğe bağlı olarak notunuzu yazın
4. "Kaydet" butonuna tıklayın

### 2. Not Yazmama
- Not alanını boş bırakırsanız, sistem otomatik olarak:
  - Sayfa numarası
  - Toplam sayfa sayısı
  - Yüzde bilgisi
  - Bölüm başlığı (varsa)
  ekleyecektir.

### 3. Bookmark Listesi
- Bookmark listesinde notlarınız tırnak işareti içinde görünür
- Not olmayan bookmark'lar otomatik bilgilerle gösterilir

## Teknik Detaylar

### Bileşenler
- `BookmarkNoteModal`: Not ekleme modal bileşeni
- `EpubReader`: EPUB okuyucu için entegrasyon
- `PdfReader`: PDF okuyucu için entegrasyon

### Veritabanı
- `bookmarks` tablosunda `note` alanı kullanılır
- Mevcut bookmark'lar geriye uyumludur

### Çeviriler
- Türkçe: `src/locales/tr/translation.json`
- İngilizce: `src/locales/en/translation.json`

## Ekran Görüntüleri

### Modal Açılışı
```
┌─────────────────────────────────────┐
│ ✕ [🔖] Yer İşaretine Not Ekle      │
├─────────────────────────────────────┤
│ Not:                                │
│ ┌─────────────────────────────────┐ │
│ │ Bu sayfa hakkında notunuzu...  │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Bu not, yer işaretinizi daha kolay │
│ bulmanıza yardımcı olacak.         │
│                                     │
│ [İptal]           [Kaydet]         │
└─────────────────────────────────────┘
```

### Bookmark Listesi
```
┌─────────────────────────────────────┐
│ Yer İşaretleri (3)              ✕ │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Bölüm 1                        │ │
│ │ "Çok güzel bir bölüm"          │ │
│ │ %25 • Sayfa 15/60              │ │
│ │ 15 Ağu 2024, 14:30            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Geliştirici Notları

### Yeni Eklenen State'ler
```typescript
const [showBookmarkNoteModal, setShowBookmarkNoteModal] = useState(false)
const [pendingBookmarkLocation, setPendingBookmarkLocation] = useState<string>('')
```

### Yeni Fonksiyonlar
```typescript
const handleAddBookmarkWithNote = async (note: string) => {
  // Bookmark'ı not ile birlikte ekle
}
```

### Modal Props
```typescript
<BookmarkNoteModal
  isOpen={showBookmarkNoteModal}
  onClose={() => setShowBookmarkNoteModal(false)}
  onSave={handleAddBookmarkWithNote}
  title={t('reader.addBookmarkNote')}
/>
```

## Gelecek Geliştirmeler

- [ ] Bookmark notlarını düzenleme
- [ ] Not arama özelliği
- [ ] Not kategorileri
- [ ] Not paylaşımı
- [ ] Not istatistikleri

## Katkıda Bulunma

Bu özelliği geliştirmek için:
1. Issue açın
2. Feature branch oluşturun
3. Pull request gönderin

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
