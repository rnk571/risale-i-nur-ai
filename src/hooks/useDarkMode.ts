import { useState, useEffect } from 'react'

export const useDarkMode = () => {
  // System preference'ı kontrol et
  const getInitialTheme = () => {
    // LocalStorage'dan kayıtlı tercihi kontrol et
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      return savedTheme === 'dark'
    }
    
    // System preference'ı kontrol et
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    
    return false
  }

  const [isDarkMode, setIsDarkMode] = useState<boolean>(getInitialTheme)

  useEffect(() => {
    const root = window.document.documentElement
    
    if (isDarkMode) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  // System preference değişikliklerini dinle
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Sadece kullanıcı manuel bir tercih yapmamışsa system preference'ı takip et
      const savedTheme = localStorage.getItem('theme')
      if (!savedTheme) {
        setIsDarkMode(e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  return {
    isDarkMode,
    toggleDarkMode,
    setDarkMode: setIsDarkMode
  }
}