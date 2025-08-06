# 🤝 Katkıda Bulunma Rehberi

Bu projeye katkıda bulunmak istediğiniz için teşekkürler! Bu rehber, projeye nasıl katkıda bulunabileceğinizi açıklar.

## 📋 İçindekiler

- [Başlamadan Önce](#başlamadan-önce)
- [Geliştirme Ortamı](#geliştirme-ortamı)
- [Kod Standartları](#kod-standartları)
- [Commit Mesajları](#commit-mesajları)
- [Pull Request Süreci](#pull-request-süreci)
- [Raporlama](#raporlama)

## 🚀 Başlamadan Önce

### Gereksinimler
- Node.js 18+
- npm veya yarn
- Git
- Supabase hesabı (opsiyonel)

### Projeyi Fork Edin
1. GitHub'da projeyi fork edin
2. Fork'unuzu local'e klonlayın:
   ```bash
   git clone https://github.com/kullaniciadi/elektronik-kitap-okuyucu.git
   cd elektronik-kitap-okuyucu
   ```

### Bağımlılıkları Yükleyin
```bash
npm install
```

### Environment Variables
`.env` dosyası oluşturun:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛠️ Geliştirme Ortamı

### Development Server
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## 📝 Kod Standartları

### TypeScript
- Strict mode kullanın
- Type annotations ekleyin
- Interface'leri export edin
- Generic'leri uygun şekilde kullanın

### React
- Functional components kullanın
- Hooks'ları doğru şekilde kullanın
- Props interface'lerini tanımlayın
- Error boundaries ekleyin

### Styling
- Tailwind CSS kullanın
- Custom CSS'den kaçının
- Responsive design uygulayın
- Dark mode desteği ekleyin

### Örnek Component
```typescript
import React from 'react'

interface MyComponentProps {
  title: string
  onAction?: () => void
}

export const MyComponent: React.FC<MyComponentProps> = ({ 
  title, 
  onAction 
}) => {
  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      {onAction && (
        <button 
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Action
        </button>
      )}
    </div>
  )
}
```

## 💬 Commit Mesajları

Conventional Commits standardını kullanın:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Tipleri
- `feat`: Yeni özellik
- `fix`: Hata düzeltmesi
- `docs`: Dokümantasyon değişiklikleri
- `style`: Kod formatı değişiklikleri
- `refactor`: Kod refactoring
- `test`: Test ekleme veya düzenleme
- `chore`: Build süreci veya yardımcı araçlar

### Örnekler
```bash
feat: add dark mode support
fix: resolve authentication issue
docs: update README with new features
style: format code with prettier
refactor: improve component structure
test: add unit tests for auth component
chore: update dependencies
```

## 🔄 Pull Request Süreci

### 1. Branch Oluşturun
```bash
git checkout -b feature/amazing-feature
# veya
git checkout -b fix/bug-fix
```

### 2. Değişikliklerinizi Yapın
- Kodunuzu yazın
- Testleri ekleyin
- Dokümantasyonu güncelleyin

### 3. Commit Edin
```bash
git add .
git commit -m "feat: add amazing feature"
```

### 4. Push Edin
```bash
git push origin feature/amazing-feature
```

### 5. Pull Request Oluşturun
1. GitHub'da Pull Request oluşturun
2. Template'i doldurun
3. Reviewers ekleyin
4. Labels ekleyin

### PR Template
```markdown
## 📝 Açıklama
Bu PR ne yapıyor?

## 🎯 Değişiklik Türü
- [ ] Bug fix
- [ ] Yeni özellik
- [ ] Breaking change
- [ ] Dokümantasyon güncellemesi

## 🧪 Test Edildi
- [ ] Local'de test edildi
- [ ] Unit testler eklendi
- [ ] E2E testler eklendi

## 📸 Screenshots (varsa)
<!-- UI değişiklikleri için screenshot ekleyin -->

## ✅ Checklist
- [ ] Kod standartlarına uygun
- [ ] TypeScript hataları yok
- [ ] Responsive design uygulandı
- [ ] Dark mode desteği eklendi
- [ ] Dokümantasyon güncellendi
```

## 🐛 Raporlama

### Bug Report Template
```markdown
## 🐛 Bug Açıklaması
Açık ve net bir şekilde hatayı açıklayın.

## 🔄 Tekrar Etme Adımları
1. '...' sayfasına gidin
2. '...' butonuna tıklayın
3. '...' hatası görünür

## 📱 Beklenen Davranış
Ne olması gerekiyordu?

## 🖥️ Sistem Bilgileri
- OS: [Windows/Mac/Linux]
- Browser: [Chrome/Firefox/Safari]
- Version: [version]

## 📸 Screenshots
Varsa screenshot ekleyin

## 🔧 Ek Bilgiler
Ek bağlam veya log'lar
```

### Feature Request Template
```markdown
## 💡 Özellik İsteği
Açık ve net bir şekilde özelliği açıklayın.

## 🎯 Problem
Bu özellik hangi problemi çözüyor?

## 💭 Önerilen Çözüm
Nasıl çalışmasını istiyorsunuz?

## 🔄 Alternatifler
Düşündüğünüz alternatif çözümler var mı?

## 📱 Kullanım Senaryosu
Bu özellik nasıl kullanılacak?
```

## 🏷️ Labels

### Issue Labels
- `bug`: Hata raporu
- `enhancement`: Özellik isteği
- `documentation`: Dokümantasyon
- `good first issue`: İlk katkı için uygun
- `help wanted`: Yardım gerekli
- `question`: Soru

### PR Labels
- `breaking`: Breaking change
- `bug fix`: Hata düzeltmesi
- `feature`: Yeni özellik
- `documentation`: Dokümantasyon
- `dependencies`: Bağımlılık güncellemesi

## 📞 İletişim

- **GitHub Issues**: [Issues sayfası](https://github.com/kullaniciadi/elektronik-kitap-okuyucu/issues)
- **Discussions**: [Discussions sayfası](https://github.com/kullaniciadi/elektronik-kitap-okuyucu/discussions)

## 🙏 Teşekkürler

Katkıda bulunduğunuz için teşekkürler! Bu proje topluluk katkıları ile büyüyor. 🌟 