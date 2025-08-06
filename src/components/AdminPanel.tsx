import React, { useState, useEffect } from 'react'
import { supabase, type Book } from '../lib/supabase'
import { Upload, Plus, Trash2, Edit, Eye, EyeOff, BookOpen, Settings } from 'lucide-react'

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

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToLibrary }) => {
  const [books, setBooks] = useState<Book[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    cover_image: '',
    epub_file: null as File | null,
    selectedUsers: [] as string[]
  })

  useEffect(() => {
    fetchBooks()
    fetchUsers()
  }, [])

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
    if (!formData.title || !formData.author || !formData.epub_file) return

    try {
      setUploading(true)

      // EPUB dosyasını yükle
      const epubUrl = await handleFileUpload(formData.epub_file)

      // Kitabı veritabanına ekle
      const bookData = {
        title: formData.title,
        author: formData.author,
        description: formData.description || null,
        cover_image: formData.cover_image || null,
        epub_file_path: epubUrl,
        is_active: true
      }

      let bookId: string

      if (editingBook) {
        // Güncelle
        const { error } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', editingBook.id)

        if (error) throw error
        bookId = editingBook.id

        // Mevcut erişimleri sil ve yenilerini ekle
        await supabase
          .from('user_book_access')
          .delete()
          .eq('book_id', bookId)
      } else {
        // Yeni ekle
        const { data, error } = await supabase
          .from('books')
          .insert([bookData])
          .select('id')
          .single()

        if (error) throw error
        bookId = data.id
      }

      // Seçilen kullanıcılara erişim ver
      if (formData.selectedUsers.length > 0) {
        const accessData = formData.selectedUsers.map(userId => ({
          user_id: userId,
          book_id: bookId
        }))

        const { error: accessError } = await supabase
          .from('user_book_access')
          .insert(accessData)

        if (accessError) throw accessError
      }

      // Formu temizle ve listeyi yenile
      setFormData({
        title: '',
        author: '',
        description: '',
        cover_image: '',
        epub_file: null,
        selectedUsers: []
      })
      setShowAddForm(false)
      setEditingBook(null)
      fetchBooks()
    } catch (error) {
      console.error('Kitap yükleme hatası:', error)
      alert('Kitap yüklenirken hata oluştu')
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
      fetchBooks()
    } catch (error) {
      console.error('Kitap durumu güncellenirken hata:', error)
    }
  }

  const deleteBook = async (book: Book) => {
    if (!confirm(`"${book.title}" kitabını silmek istediğinizden emin misiniz?`)) return

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', book.id)

      if (error) throw error
      fetchBooks()
    } catch (error) {
      console.error('Kitap silinirken hata:', error)
    }
  }

  const startEdit = async (book: Book) => {
    setEditingBook(book)
    
    // Mevcut erişimleri yükle
    const { data: accessData } = await supabase
      .from('user_book_access')
      .select('user_id')
      .eq('book_id', book.id)
    
    const selectedUsers = accessData?.map(access => access.user_id) || []
    
    setFormData({
      title: book.title,
      author: book.author,
      description: book.description || '',
      cover_image: book.cover_image || '',
      epub_file: null,
      selectedUsers
    })
    setShowAddForm(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Admin Header */}
      <div className="bg-white/90 backdrop-blur-xl shadow-xl border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Left Section - Title */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Admin Paneli
                </h1>
                <p className="text-sm text-gray-500 mt-1">Kitap ve kullanıcı yönetimi</p>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-3">
              {/* Stats Badge */}
              <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-white/80 border border-white/50 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">{books.length} Kitap</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">{users.length} Kullanıcı</span>
                </div>
              </div>

              {/* Add Book Button */}
              <button
                onClick={() => setShowAddForm(true)}
                className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                <span className="font-medium">Kitap Ekle</span>
              </button>

              {/* Back to Library */}
              <button
                onClick={onBackToLibrary}
                className="group flex items-center gap-2 px-6 py-3 bg-white/80 border border-white/50 text-gray-700 rounded-2xl hover:bg-white hover:border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <BookOpen className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                <span className="font-medium hidden sm:inline">Kütüphane</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 mb-12 animate-fade-in-up">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  {editingBook ? <Edit className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {editingBook ? 'Kitap Düzenle' : 'Yeni Kitap Ekle'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingBook ? 'Mevcut kitabı güncelleyin' : 'Kütüphaneye yeni kitap ekleyin'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingBook(null)
                  setFormData({ title: '', author: '', description: '', cover_image: '', epub_file: null, selectedUsers: [] })
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="w-6 h-6 text-gray-400 hover:text-gray-600 font-bold">×</div>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Temel Bilgiler
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Kitap Başlığı *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="Kitap başlığını girin..."
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Yazar *
                    </label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      required
                      placeholder="Yazar adını girin..."
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      placeholder="Kitap hakkında kısa açıklama..."
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Media Section */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-amber-600" />
                  Medya Dosyaları
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Kapak Resmi URL
                    </label>
                    <input
                      type="url"
                      value={formData.cover_image}
                      onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                      placeholder="https://example.com/cover.jpg"
                      className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      EPUB Dosyası *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".epub"
                        onChange={(e) => setFormData({ ...formData, epub_file: e.target.files?.[0] || null })}
                        required={!editingBook}
                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                      />
                    </div>
                    {editingBook && (
                      <p className="text-xs text-amber-600 mt-1">
                        Mevcut dosyayı değiştirmek için yeni dosya seçin
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Kullanıcı Erişim Seçimi */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Erişim Verilecek Kullanıcılar
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {users.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Henüz kayıtlı kullanıcı bulunmuyor
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.selectedUsers.length === users.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, selectedUsers: users.map(u => u.id) })
                            } else {
                              setFormData({ ...formData, selectedUsers: [] })
                            }
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Tüm Kullanıcılar</span>
                      </label>
                      <hr className="my-2" />
                      {users.map((user) => (
                        <label key={user.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ 
                                  ...formData, 
                                  selectedUsers: [...formData.selectedUsers, user.id] 
                                })
                              } else {
                                setFormData({ 
                                  ...formData, 
                                  selectedUsers: formData.selectedUsers.filter(id => id !== user.id) 
                                })
                              }
                            }}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-900">{user.email}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({new Date(user.created_at).toLocaleDateString('tr-TR')})
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Seçilen kullanıcılar bu kitabı okuyabilecek. Hiç kullanıcı seçilmezse sadece admin erişebilir.
                </p>
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Yükleniyor...' : editingBook ? 'Güncelle' : 'Kitap Ekle'}
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
                      epub_file: null,
                      selectedUsers: []
                    })
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Books List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Kitaplar ({books.length})</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <BookOpen className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-600" />
              <p>Kitaplar yükleniyor...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Henüz kitap eklenmemiş</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kitap
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Yazar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Eklenme Tarihi
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {books.map((book) => (
                    <tr key={book.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-8">
                            {book.cover_image ? (
                              <img
                                src={book.cover_image}
                                alt={book.title}
                                className="h-12 w-8 object-cover rounded"
                              />
                            ) : (
                              <div className="h-12 w-8 bg-blue-500 rounded flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{book.title}</div>
                            {book.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {book.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {book.author}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          book.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {book.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(book.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toggleBookStatus(book)}
                            className={`p-1 rounded hover:bg-gray-100 ${
                              book.is_active ? 'text-red-600' : 'text-green-600'
                            }`}
                            title={book.is_active ? 'Pasif yap' : 'Aktif yap'}
                          >
                            {book.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => startEdit(book)}
                            className="p-1 rounded hover:bg-gray-100 text-blue-600"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteBook(book)}
                            className="p-1 rounded hover:bg-gray-100 text-red-600"
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
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel