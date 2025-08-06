import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { BookOpen, Mail, Lock, AlertCircle, Moon, Sun } from 'lucide-react'

interface AuthProps {
  onAuthSuccess: () => void
  isDarkMode?: boolean
  toggleDarkMode?: () => void
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess, isDarkMode = false, toggleDarkMode }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isLogin) {
        // Giriş yap
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) {
          throw error
        }

        if (data.user) {
          onAuthSuccess()
        }
      } else {
        // Kayıt ol
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        })

        if (error) {
          throw error
        }

        if (data.user) {
          setMessage('Kayıt başarılı! E-posta adresinizi kontrol edin.')
          setIsLogin(true)
        }
      }
    } catch (err: any) {
      console.error('Auth hatası:', err)
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full">
        {/* Dark Mode Toggle - Top Right */}
        {toggleDarkMode && (
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleDarkMode}
              className="group p-3 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border border-white/30 dark:border-dark-600/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
              title={isDarkMode ? 'Açık tema' : 'Koyu tema'}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-500 group-hover:text-amber-600 transition-colors group-hover:rotate-180 duration-300" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600 group-hover:text-slate-700 transition-colors group-hover:rotate-12 duration-300" />
              )}
            </button>
          </div>
        )}

        {/* Floating Card */}
        <div className="bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-white/20 dark:border-dark-700/30 transition-colors duration-300">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="relative mx-auto w-16 h-16 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-2 transition-colors duration-300">
              {isLogin ? 'Hoş Geldiniz!' : 'Aramıza Katılın!'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">
              {isLogin 
                ? 'Kitap okuma yolculuğunuza devam edin' 
                : 'Dijital okuma deneyiminiz başlasın'
              }
            </p>
          </div>
          
          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3 transition-colors duration-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3 transition-colors duration-300">
              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span>{message}</span>
            </div>
          )}
          
          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email Field */}
              <div className="relative">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 transition-colors duration-300" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="ornek@email.com"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full opacity-50"></div>
                  </div>
                </div>
              </div>
              
              {/* Password Field */}
              <div className="relative">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 transition-colors duration-300" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="En az 6 karakter"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full opacity-50"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  {isLogin ? 'Giriş yapılıyor...' : 'Kayıt olunuyor...'}
                </div>
              ) : (
                <>
                  {isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
                  <div className="absolute inset-0 bg-white rounded-xl opacity-0 hover:opacity-10 transition-opacity duration-200"></div>
                </>
              )}
            </button>

            {/* Toggle Link */}
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError(null)
                  setMessage(null)
                }}
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium transition-colors duration-200 relative group"
              >
                {isLogin 
                  ? 'Hesabınız yok mu? Hesap oluşturun' 
                  : 'Zaten hesabınız var mı? Giriş yapın'
                }
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 dark:bg-blue-400 transition-all duration-200 group-hover:w-full"></div>
              </button>
            </div>
          </form>
        </div>

        {/* Demo Info */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-dark-600/30 transition-colors duration-300">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium transition-colors duration-300">
              Demo: admin@demo.com / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Auth