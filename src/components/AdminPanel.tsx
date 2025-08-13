import React, { useState, useEffect, useRef } from 'react'
import { supabase, type Book } from '../lib/supabase'
import { Upload, Plus, Trash2, Edit, Eye, EyeOff, BookOpen, Settings, Users, Search, ArrowLeft, X, ChevronDown, SlidersHorizontal, RotateCcw } from 'lucide-react'

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
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Erişim Verilecek Kullanıcılar ({selectedUsers.length} seçili)
      </label>
      
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
          <span className="text-gray-700 dark:text-gray-300">
            {selectedUsers.length === 0 ? 'Kullanıcı seçin...' : `${selectedUsers.length} kullanıcı seçili`}
          </span>
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
                  placeholder="Kullanıcı ara..."
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
                  {searchTerm ? 'Kullanıcı bulunamadı' : 'Henüz kullanıcı yok'}
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
                      onChange={() => {}} // onClick handles the change
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(user.created_at).toLocaleDateString('tr-TR')}
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
          selectedUsers: Array.isArray(parsed.selectedUsers) ? parsed.selectedUsers : []
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
      selectedUsers: [] as string[]
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

  // Filtre state'leri
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'active' | 'inactive',
    language: 'all' as 'all' | 'tr' | 'en',
    accessType: 'all' as 'all' | 'public' | 'private',
    sortBy: 'created_desc' as 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc' | 'author_asc' | 'author_desc'
  })
  const [showFilters, setShowFilters] = useState(false)

  // Gelişmiş filtreleme ve sıralama
  const filteredBooks = books
    .filter(book => {
      // Arama terimi filtresi
      const matchesSearch = !searchTerm || 
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (book.description && book.description.toLowerCase().includes(searchTerm.toLowerCase()))

      // Durum filtresi
      const matchesStatus = filters.status === 'all' ||
        (filters.status === 'active' && book.is_active) ||
        (filters.status === 'inactive' && !book.is_active)

      // Dil filtresi
      const matchesLanguage = filters.language === 'all' ||
        book.language === filters.language

      // Erişim türü filtresi
      const matchesAccessType = filters.accessType === 'all' ||
        (filters.accessType === 'public' && book.is_public) ||
        (filters.accessType === 'private' && !book.is_public)

      return matchesSearch && matchesStatus && matchesLanguage && matchesAccessType
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'title_asc':
          return a.title.localeCompare(b.title, 'tr')
        case 'title_desc':
          return b.title.localeCompare(a.title, 'tr')
        case 'author_asc':
          return a.author.localeCompare(b.author, 'tr')
        case 'author_desc':
          return b.author.localeCompare(a.author, 'tr')
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

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
        epub_file: null // File objeleri serialize edilemez
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

  // Page Visibility API - Admin panel durumunu koru
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Sekme odağına döndüğünde verileri yenile
        console.log('Admin panel sekme odağına döndü, veriler yenileniyor...')
        fetchBooks()
        fetchUsers()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

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

  // Modal açıkken odak ve ESC ile kapatma + body scroll kilidi
  useEffect(() => {
    if (!showAddForm) return
    const t = setTimeout(() => firstFieldRef.current?.focus(), 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddForm(false)
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

  const handleFileUpload = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `books/${fileName}`

    const { error } = await supabase.storage
      .from('epub-files')
      .upload(filePath, file)

    if (error) throw error

    const { data } = supabase.storage
      .from('epub-files')
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
        epubUrl = await handleFileUpload(formData.epub_file)
      }

      // Kitap veri gövdesi
      const bookData: any = {
        title: formData.title,
        author: formData.author,
        description: formData.description,
        cover_image: formData.cover_image,
        language: formData.language,
        is_public: !!formData.is_public,
        epub_file_path: epubUrl
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
        selectedUsers: []
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
    if (!confirm('Bu kitabı silmek istediğinizden emin misiniz?')) return

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
        selectedUsers: selectedUserIds
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
              <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
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
                Admin Paneli
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Kitap ve kullanıcı yönetimi</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{editingBook ? 'Düzenle' : 'Kitap Ekle'}</span>
            <span className="sm:hidden">{editingBook ? 'Düzenle' : 'Ekle'}</span>
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
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Toplam Kitap</p>
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
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Aktif Kitap</p>
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
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Kullanıcı</p>
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
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Pasif Kitap</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Form - Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => { setShowAddForm(false); setEditingBook(null) }}
            />
            <div className="relative z-10 flex items-start sm:items-center justify-center min-h-full p-4">
              <div className="w-full max-w-4xl bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-700">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {editingBook ? 'Kitap Düzenle' : 'Yeni Kitap Ekle'}
                  </h2>
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
                <form onSubmit={handleSubmit} className="space-y-6 p-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kitap Bilgileri */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Kitap Bilgileri</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kitap Adı *
                    </label>
                    <input
                      type="text"
                        ref={firstFieldRef}
                        value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Kitap adını girin"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Yazar *
                    </label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Yazar adını girin"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                      placeholder="Kitap açıklaması..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kapak Resmi URL
                    </label>
                    <input
                      type="url"
                      value={formData.cover_image}
                      onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                      className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="https://example.com/cover.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dil
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value as 'tr' | 'en' })}
                      className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                    >
                      <option value="tr">Türkçe</option>
                      <option value="en">İngilizce</option>
                    </select>
                  </div>
                </div>

                {/* Dosya ve Erişim */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dosya ve Erişim</h3>
                  <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-dark-700/50 border border-gray-200 dark:border-dark-600/40 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Herkese Açık Erişim</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Açık olduğunda tüm kullanıcılar bu kitabı görebilir</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <span className="mr-3 text-sm text-gray-700 dark:text-gray-300">{formData.is_public ? 'Açık' : 'Kapalı'}</span>
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!formData.is_public}
                        onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                      />
                      <div className="relative w-12 h-6 bg-gray-200 dark:bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      EPUB Dosyası *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".epub"
                        onChange={(e) => setFormData({ ...formData, epub_file: e.target.files?.[0] || null })}
                        className="w-full px-4 py-3 bg-white/60 dark:bg-dark-700/60 border border-gray-300 dark:border-dark-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/50 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/70"
                        required={!editingBook}
                      />
                    </div>
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
                      Hiçbir kullanıcı seçilmezse, kitap sadece admin kullanıcılar tarafından görülebilir.
                    </p>
                  </div>
                </div>
              </div>

                {/* Form Actions */}
                <div className="flex items-center gap-4 pt-6 border-t border-white/30 dark:border-dark-600/30">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      {editingBook ? 'Güncelle' : 'Kitap Ekle'}
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
                      selectedUsers: []
                    })
                  }}
                  className="px-6 py-3 bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl"
                >
                  İptal
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
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Kitap Listesi</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({filteredBooks.length} / {books.length} kitap)
                  </span>
                </div>
                
                {/* Arama ve Filtre - Desktop'ta yan yana */}
                <div className="flex flex-col sm:flex-row gap-3 lg:items-center">
                  {/* Arama Barı */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center">
                      <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="Kitap, yazar veya açıklama ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-80 pl-10 pr-10 py-3 bg-white/60 dark:bg-dark-700/60 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 shadow-lg hover:shadow-xl focus:shadow-xl"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Aramayı temizle"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filtre Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 whitespace-nowrap ${
                      showFilters 
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                        : 'bg-white/60 dark:bg-dark-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-600/60'
                    } border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-sm font-medium">Filtreler</span>
                  </button>
                </div>
              </div>

              {/* Filtreler */}
              <div className="space-y-4">

                {/* Filtreler */}
                {showFilters && (
                  <div className="bg-white/60 dark:bg-dark-700/60 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 rounded-xl p-4 shadow-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Durum Filtresi */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Durum
                        </label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters({...filters, status: e.target.value as any})}
                          className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                        >
                          <option value="all">Tümü</option>
                          <option value="active">Aktif</option>
                          <option value="inactive">Pasif</option>
                        </select>
                      </div>

                      {/* Dil Filtresi */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Dil
                        </label>
                        <select
                          value={filters.language}
                          onChange={(e) => setFilters({...filters, language: e.target.value as any})}
                          className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                        >
                          <option value="all">Tümü</option>
                          <option value="tr">Türkçe</option>
                          <option value="en">İngilizce</option>
                        </select>
                      </div>

                      {/* Erişim Türü */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Erişim
                        </label>
                        <select
                          value={filters.accessType}
                          onChange={(e) => setFilters({...filters, accessType: e.target.value as any})}
                          className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                        >
                          <option value="all">Tümü</option>
                          <option value="public">Herkese Açık</option>
                          <option value="private">Özel</option>
                        </select>
                      </div>

                      {/* Sıralama */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sırala
                        </label>
                        <select
                          value={filters.sortBy}
                          onChange={(e) => setFilters({...filters, sortBy: e.target.value as any})}
                          className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                        >
                          <option value="created_desc">En Yeni</option>
                          <option value="created_asc">En Eski</option>
                          <option value="title_asc">Başlık (A-Z)</option>
                          <option value="title_desc">Başlık (Z-A)</option>
                          <option value="author_asc">Yazar (A-Z)</option>
                          <option value="author_desc">Yazar (Z-A)</option>
                        </select>
                      </div>
                    </div>

                    {/* Filtreleri Temizle */}
                    <div className="flex justify-end mt-4 pt-3 border-t border-gray-200 dark:border-dark-600">
                      <button
                        onClick={() => {
                          setFilters({
                            status: 'all',
                            language: 'all',
                            accessType: 'all',
                            sortBy: 'created_desc'
                          })
                          setSearchTerm('')
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Filtreleri Temizle
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/60 dark:bg-dark-700/60">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kitap
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Yazar
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Dil
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/30 dark:divide-dark-600/30">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-white/40 dark:hover:bg-dark-700/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 dark:from-blue-600 dark:via-purple-600 dark:to-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        book.language === 'en'
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                          : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                      }`}>
                        {book.language === 'en' ? 'EN' : 'TR'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        book.is_active
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                          : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                      }`}>
                        {book.is_active ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            Aktif
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            Pasif
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(book.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(book)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center justify-center"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => toggleBookStatus(book)}
                          className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                            book.is_active
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
                  <div className="w-16 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 dark:from-blue-600 dark:via-purple-600 dark:to-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    {book.cover_image ? (
                      <img
                        src={book.cover_image}
                        alt={book.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <BookOpen className="w-8 h-8 text-white" />
                    )}
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
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                              book.language === 'en'
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                                : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                            }`}>
                              {book.language === 'en' ? 'EN' : 'TR'}
                            </span>
                          </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        book.is_active
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                          : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                      }`}>
                        {book.is_active ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            Aktif
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            Pasif
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
                          className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                            book.is_active
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