import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User, Mail, Calendar, Shield, Trash2, AlertTriangle, ArrowLeft, UserX } from 'lucide-react'

interface ProfileProps {
  user: {
    id: string
    email: string
    role: 'user' | 'admin'
  }
  onBackToLibrary: () => void
}

export const Profile: React.FC<ProfileProps> = ({ user, onBackToLibrary }) => {
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadUserDetails()
  }, [user.id])

  const loadUserDetails = async () => {
    try {
      setLoading(true)
      
      // Kullanıcı detaylarını getir
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (userError) throw userError

      // Kullanıcının okuma geçmişi istatistiklerini getir
      const { data: progressData, error: progressError } = await supabase
        .from('reading_progress')
        .select('book_id, progress_percentage, current_location')
        .eq('user_id', user.id)

      if (progressError) throw progressError

      // RLS politikaları sayesinde sadece erişilebilir kitapları getirir
      const { data: accessibleBooks, error: booksError } = await supabase
        .from('books')
        .select('id')
        .eq('is_active', true)

      if (booksError) throw booksError

      const totalAccessibleBooks = accessibleBooks?.length || 0

      setUserDetails({
        ...userData,
        totalBooks: totalAccessibleBooks,
        readingBooks: progressData?.filter(p => p.progress_percentage > 0 && p.progress_percentage < 100).length || 0,
        completedBooks: progressData?.filter(p => p.progress_percentage === 100).length || 0,
        joinDate: userData?.created_at
      })

    } catch (err: any) {
      console.error('Kullanıcı detayları yükleme hatası:', err)
      setError('Kullanıcı bilgileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'HESABIMI SIL') {
      setError('Onay metnini doğru yazın')
      return
    }

    try {
      setDeleteLoading(true)
      setError(null)

      // Edge Function çağrısı - kullanıcıyı tamamen sil (auth + database)
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: { userId: user.id }
      })

      if (error) throw error

      if (data?.error) {
        throw new Error(data.error)
      }

      setSuccess('Hesabınız tamamen silindi. Çıkış yapılıyor...')
      
      // Önce kullanıcıyı çıkış yap
      await supabase.auth.signOut()
      
      // Ardından sayfayı yenile (auth sayfasına yönlendirir)
      setTimeout(() => {
        window.location.reload()
      }, 1500)

    } catch (err: any) {
      console.error('Hesap silme hatası:', err)
      setError('Hesap silinirken bir hata oluştu: ' + err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Profil bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBackToLibrary}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kütüphaneye Dön</span>
          </button>
          
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            Profilim
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Hesap bilgilerinizi görüntüleyin ve yönetin
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-6">
          {/* Profil Özeti - Web'de üstte, mobilde normal */}
          <div className="xl:col-span-4 lg:col-span-3">
            <div className="bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-dark-700/30 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {user.email}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' 
                          : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      }`}>
                        {user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                      </span>
                      {userDetails?.joinDate && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(userDetails.joinDate).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'short'
                          })} tarihinden beri üye
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* İstatistikler - Web'de yan yana */}
                <div className="grid grid-cols-3 gap-4 lg:gap-6">
                  <div className="text-center p-3 lg:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {userDetails?.totalBooks || 0}
                    </div>
                    <div className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                      Erişilebilir
                    </div>
                  </div>

                  <div className="text-center p-3 lg:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <div className="text-xl lg:text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {userDetails?.readingBooks || 0}
                    </div>
                    <div className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                      Okunuyor
                    </div>
                  </div>

                  <div className="text-center p-3 lg:p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <div className="text-xl lg:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {userDetails?.completedBooks || 0}
                    </div>
                    <div className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                      Tamamlandı
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detaylı Bilgiler */}
          <div className="xl:col-span-2 lg:col-span-2">
            <div className="bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-dark-700/30 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Hesap Detayları
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">E-posta</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{user.email}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Hesap Türü</span>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' 
                      : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  }`}>
                    {user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                  </span>
                </div>

                {userDetails?.joinDate && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Üyelik Tarihi</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date(userDetails.joinDate).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tehlikeli İşlemler */}
          <div className="xl:col-span-2 lg:col-span-1">
            <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-xl rounded-2xl p-6 border border-red-200/30 dark:border-red-800/30 shadow-lg h-fit">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-300 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Tehlikeli İşlemler
              </h3>
              
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                Bu işlem geri alınamaz. Hesabınız ve tüm verileriniz kalıcı olarak silinecektir.
              </p>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors duration-200"
              >
                <UserX className="w-4 h-4" />
                Hesabımı Sil
              </button>
            </div>
          </div>
        </div>

        {/* Hesap Silme Onay Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-dark-900 rounded-2xl p-6 max-w-md w-full border border-white/20 dark:border-dark-700/30 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Hesabı Kalıcı Olarak Sil
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecektir.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Onaylamak için <strong>"HESABIMI SIL"</strong> yazın:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-gray-100"
                  placeholder="HESABIMI SIL"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                    setError(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-dark-600 transition-colors duration-200"
                  disabled={deleteLoading}
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirmText !== 'HESABIMI SIL'}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Siliniyor...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Hesabı Sil
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
