import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase, type Book } from '../lib/supabase'
import { Upload, Plus, Trash2, Edit, Eye, EyeOff, BookOpen, Settings, Users, Search, ArrowLeft, X, ChevronDown, Download } from 'lucide-react'
import { BookFilters, defaultFilters, type FilterState } from './BookFilters'
import { filterAndSortBooks } from '../utils/bookFilters'
import JSZip from 'jszip'
import { extractChapterTitle, extractChapterOrder } from '../utils/srtParser'

interface AdminPanelProps {
  onBackToLibrary: () => void
  isDarkMode?: boolean
}

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}

// Kullanıcı seçici komponenti
interface UserSelectorProps {
  users: User[]
  selectedUsers: string[]
  onSelectionChange: (selectedUserIds: string[]) => void
}

const UserSelector: React.FC<UserSelectorProps> = ({ users, selectedUsers, onSelectionChange }) => {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filtrelenmiş kullanıcılar
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Seçili kullanıcıları getir
  const selectedUserObjects = users.filter(user => selectedUsers.includes(user.id))

  // Kullanıcı ekle/çıkar
  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onSelectionChange(selectedUsers.filter(id => id !== userId))
    } else {
      onSelectionChange([...selectedUsers, userId])
    }
  }

  // Kullanıcı kaldır
  const removeUser = (userId: string) => {
    onSelectionChange(selectedUsers.filter(id => id !== userId))
  }

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.form.usersLabel', { count: selectedUsers.length })}</label>

      {/* Seçili kullanıcılar - Tag görünümü */}
      {selectedUserObjects.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl">
          {selectedUserObjects.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm rounded-full"
            >
              <span className="truncate max-w-[200px]">{user.email}</span>
              <button
                onClick={() => removeUser(user.id)}
                className="flex-shrink-0 w-4 h-4 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full flex items-center justify-center"
                type="button"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <span className="text-gray-700 dark:text-gray-300">{selectedUsers.length === 0 ? t('admin.form.usersPlaceholder') : t('admin.form.usersLabel', { count: selectedUsers.length })}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-xl shadow-lg max-h-80 overflow-hidden">
            {/* Arama kutusu */}
            <div className="p-3 border-b border-gray-200 dark:border-dark-600">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('admin.form.usersSearch')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
            </div>

            {/* Kullanıcı listesi */}
            <div className="max-h-60 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  {searchTerm ? t('admin.form.usersNotFound') : t('admin.form.usersEmpty')}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleUser(user.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-700 text-left transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => { }} // onClick handles the change
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                          {user.role === 'admin' ? t('app.admin') : t('app.user')}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(user.created_at).toLocaleDateString(i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US')}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToLibrary }) => {
  const { t, i18n } = useTranslation()
  const [books, setBooks] = useState<Book[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // localStorage'dan durumları al
  const getInitialShowAddForm = (): boolean => {
    try {
      const saved = localStorage.getItem('admin_showAddForm')
      return saved === 'true'
    } catch (error) {
      return false
    }
  }

  const getInitialSearchTerm = (): string => {
    try {
      return localStorage.getItem('admin_searchTerm') || ''
    } catch (error) {
      return ''
    }
  }

  const getInitialFormData = () => {
    try {
      const saved = localStorage.getItem('admin_formData')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          title: parsed.title || '',
          author: parsed.author || '',
          description: parsed.description || '',
          cover_image: parsed.cover_image || '',
          language: (parsed.language === 'en' ? 'en' : 'tr') as 'tr' | 'en',
          is_public: !!parsed.is_public,
          epub_file: null as File | null, // File objeleri serialize edilemez
          audio_file: null as File | null,
          transcript_file: null as File | null,
          selectedUsers: Array.isArray(parsed.selectedUsers) ? parsed.selectedUsers : [],
          removeEpubFile: false,
          removeAudioFile: false,
          removeTranscriptFile: false
        }
      }
    } catch (error) {
      console.warn('Form data localStorage okuma hatası:', error)
    }
    return {
      title: '',
      author: '',
      description: '',
      cover_image: '',
      language: 'tr' as 'tr' | 'en',
      is_public: false,
      epub_file: null as File | null,
      audio_file: null as File | null,
      transcript_file: null as File | null,
      selectedUsers: [] as string[],
      removeEpubFile: false,
      removeAudioFile: false,
      removeTranscriptFile: false
    }
  }

  const getInitialEditingBook = (): Book | null => {
    try {
      const saved = localStorage.getItem('admin_editingBook')
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      return null
    }
  }

  const [showAddForm, setShowAddForm] = useState(getInitialShowAddForm)
  const [editingBook, setEditingBook] = useState<Book | null>(getInitialEditingBook)
  const [searchTerm, setSearchTerm] = useState(getInitialSearchTerm)
  const [formData, setFormData] = useState(getInitialFormData)
  const firstFieldRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const audioFileInputRef = useRef<HTMLInputElement | null>(null)
  const transcriptFileInputRef = useRef<HTMLInputElement | null>(null)

  // Filtre state'leri
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [showFilters, setShowFilters] = useState(false)

  // Gelişmiş filtreleme ve sıralama
  const filteredBooks = filterAndSortBooks(books, searchTerm, filters)

  // localStorage'a durumları kaydet
  useEffect(() => {
    try {
      localStorage.setItem('admin_showAddForm', showAddForm.toString())
    } catch (error) {
      console.warn('showAddForm localStorage yazma hatası:', error)
    }
  }, [showAddForm])

  useEffect(() => {
    try {
      localStorage.setItem('admin_searchTerm', searchTerm)
    } catch (error) {
      console.warn('searchTerm localStorage yazma hatası:', error)
    }
  }, [searchTerm])

  useEffect(() => {
    try {
      const dataToSave = {
        ...formData,
        epub_file: null, // File objeleri serialize edilemez
        audio_file: null,
        transcript_file: null
      }
      localStorage.setItem('admin_formData', JSON.stringify(dataToSave))
    } catch (error) {
      console.warn('formData localStorage yazma hatası:', error)
    }
  }, [formData])

  useEffect(() => {
    try {
      if (editingBook) {
        localStorage.setItem('admin_editingBook', JSON.stringify(editingBook))
      } else {
        localStorage.removeItem('admin_editingBook')
      }
    } catch (error) {
      console.warn('editingBook localStorage yazma hatası:', error)
    }
  }, [editingBook])

  // Sekme odağı değişiminde otomatik yenilemeyi kaldırdık

  // Component unmount olduğunda localStorage'ı temizle (sadece gerekli durumlarda)
  useEffect(() => {
    return () => {
      // Sadece form kapalıysa ve düzenleme yoksa localStorage'ı temizle
      if (!showAddForm && !editingBook) {
        try {
          localStorage.removeItem('admin_showAddForm')
          localStorage.removeItem('admin_formData')
          localStorage.removeItem('admin_editingBook')
        } catch (error) {
          console.warn('localStorage temizleme hatası:', error)
        }
      }
    }
  }, [])

  useEffect(() => {
    fetchBooks()
    fetchUsers()
  }, [])

  // Sekmeden dönünce açık modal/düzenleme durumunu geri yükle (focus event)
  useEffect(() => {
    const onFocus = () => {
      if (document.hidden) return
      try {
        const savedShow = localStorage.getItem('admin_showAddForm')
        if (savedShow !== null) setShowAddForm(savedShow === 'true')
        const savedEditing = localStorage.getItem('admin_editingBook')
        if (savedEditing) setEditingBook(JSON.parse(savedEditing))
      } catch { }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Modal açıkken odak ve ESC ile kapatma + body scroll kilidi
  useEffect(() => {
    if (!showAddForm) return
    const t = setTimeout(() => firstFieldRef.current?.focus(), 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Sadece düzenleme yoksa ESC ile kapat
        if (!editingBook) setShowAddForm(false)
      }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [showAddForm])

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setBooks(data || [])
    } catch (error) {
      console.error('Kitaplar yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .eq('role', 'user')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error)
    }
  }

  const handleFileUpload = async (file: File): Promise<{ url: string; type: 'epub' | 'pdf' }> => {
    const fileExt = (file.name.split('.').pop() || '').toLowerCase()
    const isPdf = fileExt === 'pdf'
    let bucket = isPdf ? 'pdf-files' : 'epub-files'
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `books/${fileName}`

    // Önce hedef bucketa yüklemeyi dene; başarısız olursa PDF için epub-files'a geri düş
    let uploadError = null as any
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)
      uploadError = error
    } catch (e: any) {
      uploadError = e
    }

    if (uploadError && isPdf) {
      // Fallback: pdf-files yoksa epub-files'a yükle
      bucket = 'epub-files'
      const { error: fallbackError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)
      if (fallbackError) throw fallbackError
    } else if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return { url: data.publicUrl, type: isPdf ? 'pdf' : 'epub' }
  }

  const uploadAudioFile = async (file: File): Promise<string> => {
    const fileExt = (file.name.split('.').pop() || '').toLowerCase()

    // Türkçe ve özel karakterleri ASCII-safe hale getir
    const sanitizeFileName = (name: string): string => {
      const charMap: Record<string, string> = {
        'ı': 'i', 'İ': 'I', 'ğ': 'g', 'Ğ': 'G',
        'ü': 'u', 'Ü': 'U', 'ş': 's', 'Ş': 'S',
        'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C',
        'â': 'a', 'Â': 'A', 'î': 'i', 'Î': 'I',
        'û': 'u', 'Û': 'U', 'ê': 'e', 'Ê': 'E'
      }

      return name
        .split('')
        .map(char => charMap[char] || char)
        .join('')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
    }

    // ZIP dosyası ise: içindeki audio dosyalarını çıkar ve manifest oluştur
    if (fileExt === 'zip') {
      const zip = new JSZip()
      const zipContent = await zip.loadAsync(file)

      // Audio dosyalarını bul (mp3, m4a, wav, ogg, aac)
      const audioExtensions = ['mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac']
      const audioFiles: { name: string; content: ArrayBuffer }[] = []

      for (const [fileName, zipEntry] of Object.entries(zipContent.files)) {
        if (!zipEntry.dir) {
          const ext = (fileName.split('.').pop() || '').toLowerCase()
          if (audioExtensions.includes(ext)) {
            const content = await zipEntry.async('arraybuffer')
            const baseName = fileName.split('/').pop() || fileName
            audioFiles.push({ name: baseName, content })
          }
        }
      }

      if (audioFiles.length === 0) {
        throw new Error('ZIP dosyasında ses dosyası bulunamadı')
      }

      // Sırala (dosya adına göre)
      audioFiles.sort((a, b) => {
        const orderA = extractChapterOrder(a.name)
        const orderB = extractChapterOrder(b.name)
        return orderA - orderB
      })

      // Her audio dosyasını yükle
      const uploadedAudios: { fileName: string; audioUrl: string; order: number; title: string }[] = []
      const baseId = Math.random().toString(36).substring(2)

      for (let i = 0; i < audioFiles.length; i++) {
        const audioFile = audioFiles[i]
        const ext = (audioFile.name.split('.').pop() || 'mp3').toLowerCase()
        const safeName = sanitizeFileName(audioFile.name)
        const audioFileName = `${baseId}_${i.toString().padStart(2, '0')}_${safeName}`
        const audioFilePath = `books/audio/chapters/${audioFileName}`

        const audioBlob = new Blob([audioFile.content], {
          type: ext === 'mp3' ? 'audio/mpeg' :
            ext === 'm4a' ? 'audio/mp4' :
              ext === 'wav' ? 'audio/wav' :
                ext === 'ogg' ? 'audio/ogg' :
                  ext === 'aac' ? 'audio/aac' :
                    ext === 'flac' ? 'audio/flac' : 'audio/mpeg'
        })

        const { error } = await supabase.storage
          .from('audio-files')
          .upload(audioFilePath, audioBlob)

        if (error) {
          console.warn(`Audio yükleme hatası: ${audioFile.name}`, error)
          continue
        }

        const { data } = supabase.storage
          .from('audio-files')
          .getPublicUrl(audioFilePath)

        uploadedAudios.push({
          fileName: audioFile.name,
          audioUrl: data.publicUrl,
          order: i + 1,
          title: extractChapterTitle(audioFile.name)
        })
      }

      if (uploadedAudios.length === 0) {
        throw new Error('Hiçbir ses dosyası yüklenemedi')
      }

      // Audio manifest oluştur
      const audioManifest = {
        version: '1.0',
        type: 'multi-chapter-audio',
        chapters: uploadedAudios
      }

      const manifestBlob = new Blob([JSON.stringify(audioManifest, null, 2)], { type: 'application/json' })
      const manifestFileName = `${baseId}_audio_manifest.json`
      const manifestFilePath = `books/audio/${manifestFileName}`

      const { error: manifestError } = await supabase.storage
        .from('audio-files')
        .upload(manifestFilePath, manifestBlob)

      if (manifestError) {
        throw manifestError
      }

      const { data: manifestData } = supabase.storage
        .from('audio-files')
        .getPublicUrl(manifestFilePath)

      return manifestData.publicUrl
    }

    // Tek dosya ise normal yükle
    const safeExt = fileExt || 'mp3'
    const fileName = `${Math.random().toString(36).substring(2)}.${safeExt}`
    const filePath = `books/audio/${fileName}`

    const { error } = await supabase.storage
      .from('audio-files')
      .upload(filePath, file)

    if (error) {
      throw error
    }

    const { data } = supabase.storage
      .from('audio-files')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const uploadTranscriptFile = async (file: File): Promise<string> => {
    const fileExt = (file.name.split('.').pop() || '').toLowerCase()

    // Türkçe ve özel karakterleri ASCII-safe hale getir
    const sanitizeFileName = (name: string): string => {
      const charMap: Record<string, string> = {
        'ı': 'i', 'İ': 'I', 'ğ': 'g', 'Ğ': 'G',
        'ü': 'u', 'Ü': 'U', 'ş': 's', 'Ş': 'S',
        'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C',
        'â': 'a', 'Â': 'A', 'î': 'i', 'Î': 'I',
        'û': 'u', 'Û': 'U', 'ê': 'e', 'Ê': 'E'
      }

      return name
        .split('')
        .map(char => charMap[char] || char)
        .join('')
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Diğer özel karakterleri alt çizgiyle değiştir
    }

    // ZIP dosyası ise: içindeki SRT'leri çıkar ve manifest oluştur
    if (fileExt === 'zip') {
      const zip = new JSZip()
      const zipContent = await zip.loadAsync(file)

      // SRT dosyalarını bul
      const srtFiles: { name: string; content: string }[] = []

      for (const [fileName, zipEntry] of Object.entries(zipContent.files)) {
        if (!zipEntry.dir && fileName.toLowerCase().endsWith('.srt')) {
          const content = await zipEntry.async('string')
          // Sadece dosya adını al (klasör yolunu çıkar)
          const baseName = fileName.split('/').pop() || fileName
          srtFiles.push({ name: baseName, content })
        }
      }

      if (srtFiles.length === 0) {
        throw new Error('ZIP dosyasında SRT dosyası bulunamadı')
      }

      // Sırala
      srtFiles.sort((a, b) => extractChapterOrder(a.name) - extractChapterOrder(b.name))

      // Her SRT'yi yükle
      const uploadedChapters: { id: string; title: string; fileName: string; srtUrl: string; order: number }[] = []
      const baseId = Math.random().toString(36).substring(2)

      for (let i = 0; i < srtFiles.length; i++) {
        const srtFile = srtFiles[i]
        // Dosya adını sanitize et
        const safeName = sanitizeFileName(srtFile.name)
        const srtFileName = `${baseId}_${i.toString().padStart(2, '0')}_${safeName}`
        const srtFilePath = `books/transcripts/srt/${srtFileName}`

        const srtBlob = new Blob([srtFile.content], { type: 'text/plain' })

        const { error: uploadError } = await supabase.storage
          .from('transcript-files')
          .upload(srtFilePath, srtBlob)

        if (uploadError) {
          console.error(`SRT yükleme hatası: ${srtFile.name}`, uploadError)
          continue
        }

        const { data: urlData } = supabase.storage
          .from('transcript-files')
          .getPublicUrl(srtFilePath)

        uploadedChapters.push({
          id: `chapter_${i + 1}`,
          title: extractChapterTitle(srtFile.name),
          fileName: srtFile.name,
          srtUrl: urlData.publicUrl,
          order: i + 1
        })
      }

      // Manifest oluştur
      const manifest = {
        version: '1.0',
        audioUrl: '', // handleSubmit'te doldurulacak
        chapters: uploadedChapters
      }

      const manifestFileName = `${baseId}_chapters.json`
      const manifestFilePath = `books/transcripts/${manifestFileName}`
      const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })

      const { error: manifestError } = await supabase.storage
        .from('transcript-files')
        .upload(manifestFilePath, manifestBlob)

      if (manifestError) {
        throw manifestError
      }

      const { data: manifestUrlData } = supabase.storage
        .from('transcript-files')
        .getPublicUrl(manifestFilePath)

      return manifestUrlData.publicUrl
    }

    // Tek SRT veya JSON dosyası
    const safeExt = fileExt || 'json'
    const fileName = `${Math.random().toString(36).substring(2)}.${safeExt}`
    const filePath = `books/transcripts/${fileName}`

    const { error } = await supabase.storage
      .from('transcript-files')
      .upload(filePath, file)

    if (error) {
      throw error
    }

    const { data } = supabase.storage
      .from('transcript-files')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.author) return
    if (!editingBook && !formData.epub_file) return

    try {
      setUploading(true)

      // EPUB dosyası: yeni dosya varsa yükle, yoksa (düzenlemede) mevcut yolu kullan
      let epubUrl = editingBook?.epub_file_path || ''
      if (formData.epub_file) {
        const uploaded = await handleFileUpload(formData.epub_file)
        epubUrl = uploaded.url
      }

      // Ses dosyası (opsiyonel)
      let audioUrl = editingBook?.audio_file_path || null
      if (formData.removeAudioFile) {
        audioUrl = null
      } else if (formData.audio_file) {
        audioUrl = await uploadAudioFile(formData.audio_file)
      }

      // Transkript dosyası (opsiyonel)
      let transcriptUrl = editingBook?.audio_transcript_path || null
      if (formData.removeTranscriptFile) {
        transcriptUrl = null
      } else if (formData.transcript_file) {
        transcriptUrl = await uploadTranscriptFile(formData.transcript_file)
      }

      // Kitap veri gövdesi
      const bookData: any = {
        title: formData.title,
        author: formData.author,
        description: formData.description,
        cover_image: formData.cover_image,
        language: formData.language,
        is_public: !!formData.is_public,
        epub_file_path: epubUrl,
        audio_file_path: audioUrl,
        audio_transcript_path: transcriptUrl
      }

      let bookId: string

      if (editingBook) {
        // Kitabı güncelle
        const { data, error } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', editingBook.id)
          .select('id')
          .single()

        if (error) throw error
        bookId = data!.id
      } else {
        // Yeni kitap ekle
        const { data, error } = await supabase
          .from('books')
          .insert({ ...bookData, is_active: true })
          .select('id')
          .single()

        if (error) throw error
        bookId = data!.id
      }

      // Kullanıcı erişimlerini güncelle (is_public kapalıysa özel erişimler uygulanır)
      if (bookId) {
        // Önce mevcut erişimleri sil
        await supabase
          .from('user_book_access')
          .delete()
          .eq('book_id', bookId)

        // Yeni erişimleri ekle
        if (!formData.is_public && formData.selectedUsers.length > 0) {
          const accessData = formData.selectedUsers.map((userId: string) => ({
            user_id: userId,
            book_id: bookId
          }))

          await supabase
            .from('user_book_access')
            .insert(accessData)
        }
      }

      // Formu sıfırla
      setFormData({
        title: '',
        author: '',
        description: '',
        cover_image: '',
        language: 'tr',
        is_public: false,
        epub_file: null,
        audio_file: null,
        transcript_file: null,
        selectedUsers: [],
        removeEpubFile: false,
        removeAudioFile: false,
        removeTranscriptFile: false
      })
      setEditingBook(null)
      setShowAddForm(false)

      // Kitapları yeniden yükle
      await fetchBooks()
    } catch (error) {
      console.error('Kitap kaydedilirken hata:', error)
      alert('Kitap kaydedilirken bir hata oluştu.')
    } finally {
      setUploading(false)
    }
  }

  const toggleBookStatus = async (book: Book) => {
    try {
      const { error } = await supabase
        .from('books')
        .update({ is_active: !book.is_active })
        .eq('id', book.id)

      if (error) throw error
      await fetchBooks()
    } catch (error) {
      console.error('Kitap durumu güncellenirken hata:', error)
    }
  }

  const deleteBook = async (book: Book) => {
    if (!confirm(t('admin.table.deleteConfirm'))) return

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', book.id)

      if (error) throw error
      await fetchBooks()
    } catch (error) {
      console.error('Kitap silinirken hata:', error)
    }
  }

  const startEdit = async (book: Book) => {
    try {
      // Kitabın mevcut kullanıcı erişimlerini al
      const { data: accessData } = await supabase
        .from('user_book_access')
        .select('user_id')
        .eq('book_id', book.id)

      const selectedUserIds = accessData?.map(access => access.user_id) || []

      setFormData({
        title: book.title,
        author: book.author,
        description: book.description || '',
        cover_image: book.cover_image || '',
        language: (book.language as 'tr' | 'en') || 'tr',
        is_public: !!book.is_public,
        epub_file: null,
        audio_file: null,
        transcript_file: null,
        selectedUsers: selectedUserIds,
        removeEpubFile: false,
        removeAudioFile: false,
        removeTranscriptFile: false
      })
      setEditingBook(book)
      setShowAddForm(true)
    } catch (error) {
      console.error('Kitap düzenleme verileri yüklenirken hata:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToLibrary}
              className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                {t('admin.title')}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('admin.subtitle')}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingBook(null)
              setFormData({
                title: '',
                author: '',
                description: '',
                cover_image: '',
                language: 'tr',
                is_public: false,
                epub_file: null,
                audio_file: null,
                transcript_file: null,
                selectedUsers: [],
                removeEpubFile: false,
                removeAudioFile: false,
                removeTranscriptFile: false
              })
              setShowAddForm(true)
            }}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{editingBook ? t('admin.form.edit') : t('admin.form.add')}</span>
            <span className="sm:hidden">{editingBook ? t('admin.form.edit') : t('admin.form.add')}</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-dark-700/30">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 dark:bg-blue-400 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{books.length}</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{t('admin.stats.totalBooks')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-dark-700/30">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500 dark:bg-emerald-400 rounded-xl flex items-center justify-center">
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white dark:bg-dark-700 flex items-center justify-center">
                  <div className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full"></div>
                </div>
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {books.filter(book => book.is_active).length}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{t('admin.stats.activeBooks')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-dark-700/30">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 dark:bg-purple-400 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{users.length}</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{t('admin.stats.users')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-dark-700/30">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-500 dark:bg-orange-400 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {books.filter(book => !book.is_active).length}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{t('admin.stats.inactiveBooks')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Form - Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                // Arka plana tıklayınca kapatmayı isteğe bağla: yalnızca düzenleme yoksa kapat
                if (!editingBook) {
                  setShowAddForm(false)
                  setEditingBook(null)
                }
              }}
            />
            <div className="relative z-10 flex items-center justify-center min-h-full p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <div className="w-full max-w-4xl bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700 max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-dark-700">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">{editingBook ? t('admin.form.editTitle') : t('admin.form.newTitle')}</h2>
                  <button
                    onClick={() => { setShowAddForm(false); setEditingBook(null) }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500"
                    aria-label="Kapat"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Kitap Bilgileri */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingBook ? t('admin.form.editTitle') : t('admin.form.newTitle')}</h3>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('admin.form.name')}
                        </label>
                        <input
                          type="text"
                          ref={firstFieldRef}
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder={t('admin.form.namePlaceholder')}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('admin.form.author')}
                        </label>
                        <input
                          type="text"
                          value={formData.author}
                          onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                          className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder={t('admin.form.authorPlaceholder')}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('admin.form.description')}
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                          placeholder={t('admin.form.descriptionPlaceholder')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('admin.form.coverUrl')}
                        </label>
                        <input
                          type="url"
                          value={formData.cover_image}
                          onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                          className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder={t('admin.form.coverUrlPlaceholder')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('admin.filter.language')}
                        </label>
                        <select
                          value={formData.language}
                          onChange={(e) => setFormData({ ...formData, language: e.target.value as 'tr' | 'en' })}
                          className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                        >
                          <option value="tr">{t('admin.filter.langTr')}</option>
                          <option value="en">{t('admin.filter.langEn')}</option>
                        </select>
                      </div>
                    </div>

                    {/* Dosya ve Erişim */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('admin.form.bookInfo')}</h3>
                      {/* EPUB/PDF Dosyası */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('admin.form.epubFile')}
                        </label>
                        <div className="relative">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".epub,.pdf"
                            onChange={(e) => setFormData({ ...formData, epub_file: e.target.files?.[0] || null })}
                            className="w-full opacity-0 absolute inset-0 cursor-pointer"
                            required={!editingBook}
                            aria-label={t('admin.form.epubFile')}
                            title={t('admin.form.epubFile')}
                          />
                          <div className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl text-gray-900 dark:text-gray-100 flex items-center justify-between pointer-events-none relative z-10">
                            <span className="text-sm truncate">
                              {formData.epub_file
                                ? formData.epub_file.name
                                : editingBook?.epub_file_path
                                  ? t('admin.form.fileExisting')
                                  : t('admin.form.noFile')}
                            </span>
                            <div className="flex items-center gap-2 pointer-events-auto">
                              {editingBook?.epub_file_path && !formData.epub_file && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    window.open(editingBook.epub_file_path || '', '_blank')
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                  title={t('common.download')}
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  fileInputRef.current?.click()
                                }}
                                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/70"
                              >
                                {t('admin.form.chooseFile')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.form.supportedFormats')}</p>

                      {/* Sesli Kitap - Opsiyonel */}
                      <div className="mt-4 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {t('admin.form.audioSectionTitle')}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('admin.form.audioSectionHint')}
                        </p>

                        {/* Ses Dosyası */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('admin.form.audioFile')}
                          </label>
                          <div className="relative">
                            <input
                              ref={audioFileInputRef}
                              type="file"
                              accept="audio/*,.zip"
                              onChange={(e) => setFormData({ ...formData, audio_file: e.target.files?.[0] || null, removeAudioFile: false })}
                              className="w-full opacity-0 absolute inset-0 cursor-pointer"
                              aria-label={t('admin.form.audioFile')}
                              title={t('admin.form.audioFile')}
                            />
                            <div className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl text-gray-900 dark:text-gray-100 flex items-center justify-between pointer-events-none relative z-10">
                              <span className="text-sm truncate">
                                {formData.audio_file
                                  ? formData.audio_file.name
                                  : formData.removeAudioFile
                                    ? t('admin.form.fileRemoved')
                                    : editingBook?.audio_file_path
                                      ? t('admin.form.audioFileExisting')
                                      : t('admin.form.noFile')}
                              </span>
                              <div className="flex items-center gap-2 pointer-events-auto">
                                {editingBook?.audio_file_path && !formData.audio_file && !formData.removeAudioFile && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        window.open(editingBook.audio_file_path || '', '_blank')
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                      title={t('common.download')}
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setFormData({ ...formData, removeAudioFile: true })
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                      title={t('common.remove')}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {formData.removeAudioFile && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setFormData({ ...formData, removeAudioFile: false })
                                    }}
                                    className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-lg text-xs font-semibold hover:bg-yellow-100 dark:hover:bg-yellow-900/70"
                                  >
                                    {t('common.undo')}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    audioFileInputRef.current?.click()
                                  }}
                                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/70"
                                >
                                  {t('admin.form.chooseFile')}
                                </button>
                              </div>
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {t('admin.form.audioFileHint')}
                          </p>
                        </div>

                        {/* Transkript Dosyası */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('admin.form.transcriptFile')}
                          </label>
                          <div className="relative">
                            <input
                              ref={transcriptFileInputRef}
                              type="file"
                              accept=".zip,.srt,.json,.txt,application/json,application/zip"
                              onChange={(e) => setFormData({ ...formData, transcript_file: e.target.files?.[0] || null, removeTranscriptFile: false })}
                              className="w-full opacity-0 absolute inset-0 cursor-pointer"
                              aria-label={t('admin.form.transcriptFile')}
                              title={t('admin.form.transcriptFile')}
                            />
                            <div className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl text-gray-900 dark:text-gray-100 flex items-center justify-between pointer-events-none relative z-10">
                              <span className="text-sm truncate">
                                {formData.transcript_file
                                  ? formData.transcript_file.name
                                  : formData.removeTranscriptFile
                                    ? t('admin.form.fileRemoved')
                                    : editingBook?.audio_transcript_path
                                      ? t('admin.form.transcriptFileExisting')
                                      : t('admin.form.noFile')}
                              </span>
                              <div className="flex items-center gap-2 pointer-events-auto">
                                {editingBook?.audio_transcript_path && !formData.transcript_file && !formData.removeTranscriptFile && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        window.open(editingBook.audio_transcript_path || '', '_blank')
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                      title={t('common.download')}
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setFormData({ ...formData, removeTranscriptFile: true })
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                      title={t('common.remove')}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {formData.removeTranscriptFile && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setFormData({ ...formData, removeTranscriptFile: false })
                                    }}
                                    className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-lg text-xs font-semibold hover:bg-yellow-100 dark:hover:bg-yellow-900/70"
                                  >
                                    {t('common.undo')}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    transcriptFileInputRef.current?.click()
                                  }}
                                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/70"
                                >
                                  {t('admin.form.chooseFile')}
                                </button>
                              </div>
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {t('admin.form.transcriptFileHint')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-dark-700/50 border border-gray-200 dark:border-dark-600/40 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('admin.form.publicAccess')}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.form.publicAccessHint')}</p>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                          <span className="mr-3 text-sm text-gray-700 dark:text-gray-300">{formData.is_public ? t('admin.form.publicOn') : t('admin.form.publicOff')}</span>
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={!!formData.is_public}
                            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                          />
                          <div className="relative w-12 h-6 bg-gray-200 dark:bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className={`${formData.is_public ? 'opacity-50 pointer-events-none' : ''}`}>
                        <UserSelector
                          users={users}
                          selectedUsers={formData.selectedUsers}
                          onSelectionChange={(selectedUserIds) => {
                            setFormData({
                              ...formData,
                              selectedUsers: selectedUserIds
                            })
                          }}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {t('admin.form.usersHint')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-6 border-t border-white/30 dark:border-dark-600/30">
                    <button
                      type="submit"
                      disabled={uploading}
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          {t('admin.form.saving')}
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          {editingBook ? t('admin.form.edit') : t('admin.form.add')}
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false)
                        setEditingBook(null)
                        setFormData({
                          title: '',
                          author: '',
                          description: '',
                          cover_image: '',
                          language: 'tr',
                          is_public: false,
                          epub_file: null,
                          audio_file: null,
                          transcript_file: null,
                          selectedUsers: [],
                          removeEpubFile: false,
                          removeAudioFile: false,
                          removeTranscriptFile: false
                        })
                      }}
                      className="px-4 sm:px-6 py-3 bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Books List */}
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-dark-700/30 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/30 dark:border-dark-600/30">
            <BookFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filters={filters}
              onFiltersChange={setFilters}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              totalCount={books.length}
              filteredCount={filteredBooks.length}
              showStatusFilter={true}
              className="mb-4"
            />
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/60 dark:bg-dark-700/60">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.table.book')}</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.table.author')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.table.language')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.table.status')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.table.date')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/30 dark:divide-dark-600/30">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-white/40 dark:hover:bg-dark-700/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 dark:from-blue-600 dark:via-purple-600 dark:to-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md relative">
                          {book.cover_image ? (
                            <img
                              src={book.cover_image}
                              alt={book.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <BookOpen className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {book.title}
                          </h3>
                          {/* Format rozet */}
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {((book as any).epub_file_path || '').toLowerCase().endsWith('.pdf') ? 'PDF' : 'EPUB'}
                            </span>
                            {(book as any).audio_file_path && (
                              <span className="inline-flex items-center px-2 py-0.5 ml-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                                AUDIO
                              </span>
                            )}
                          </div>
                          {book.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                              {book.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{book.author}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${book.language === 'en'
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                        : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                        }`}>
                        {book.language === 'en' ? 'EN' : 'TR'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${book.is_active
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                        : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                        }`}>
                        {book.is_active ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            {t('admin.table.active')}
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            {t('admin.table.inactive')}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(book.created_at).toLocaleDateString(i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US')}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(book)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center justify-center"
                          title={t('admin.table.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => toggleBookStatus(book)}
                          className={`p-2 rounded-lg transition-colors flex items-center justify-center ${book.is_active
                            ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/50'
                            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/50'
                            }`}
                          title={book.is_active ? t('admin.table.makeInactive') : t('admin.table.makeActive')}
                        >
                          {book.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => deleteBook(book)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors flex items-center justify-center"
                          title={t('admin.table.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden p-4 space-y-4">
            {filteredBooks.map((book) => (
              <div key={book.id} className="bg-white/60 dark:bg-dark-700/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 dark:border-dark-700/30 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 dark:from-blue-600 dark:via-purple-600 dark:to-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md relative">
                    {book.cover_image ? (
                      <img
                        src={book.cover_image}
                        alt={book.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <BookOpen className="w-8 h-8 text-white" />
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide bg-white/90 dark:bg-dark-900/90 text-gray-800 dark:text-gray-200 border border-white/50">
                      {((book as any).epub_file_path || '').toLowerCase().endsWith('.pdf') ? 'PDF' : 'EPUB'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {book.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {book.author}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${book.language === 'en'
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                            }`}>
                            {book.language === 'en' ? 'EN' : 'TR'}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${book.is_active
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                        : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                        }`}>
                        {book.is_active ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            {t('admin.table.active')}
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            {t('admin.table.inactive')}
                          </>
                        )}
                      </span>
                    </div>

                    {book.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                        {book.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(book.created_at).toLocaleDateString('tr-TR')}
                      </p>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(book)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center justify-center"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => toggleBookStatus(book)}
                          className={`p-2 rounded-lg transition-colors flex items-center justify-center ${book.is_active
                            ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/50'
                            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/50'
                            }`}
                          title={book.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                        >
                          {book.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => deleteBook(book)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors flex items-center justify-center"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 dark:bg-dark-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm ? 'Kitap Bulunamadı' : 'Henüz Kitap Yok'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm
                  ? 'Arama kriterlerinizi değiştirip tekrar deneyin'
                  : 'İlk kitabınızı eklemek için "Kitap Ekle" butonuna tıklayın.'
                }
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 px-4 py-2 bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl"
                >
                  Aramayı Temizle
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel