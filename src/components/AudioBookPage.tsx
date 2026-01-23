import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Moon, Sun, AlertCircle } from 'lucide-react'
import { type Book } from '../lib/supabase'
import { AudioBookPlayer } from './AudioBookPlayer'
import {
    parseSrt,
    parseWordTimingJson,
    type SrtCue,
    type ChaptersManifest
} from '../utils/srtParser'

interface AudioBookPageProps {
    book: Book
    userId?: string  // Optional for guest mode
    onBackToLibrary: () => void
    isDarkMode?: boolean
    toggleDarkMode?: () => void
}

interface ChapterData {
    id: string
    title: string
    fileName: string
    cues: SrtCue[]
    order: number
    audioUrl?: string  // Chapter'a özel audio URL (opsiyonel)
}

export const AudioBookPage: React.FC<AudioBookPageProps> = ({
    book,
    onBackToLibrary,
    isDarkMode = false,
    toggleDarkMode
}) => {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [chapters, setChapters] = useState<ChapterData[]>([])
    const [audioUrl, setAudioUrl] = useState<string | null>(null)

    // iOS cihaz tespiti
    const isIOSDevice =
        typeof navigator !== 'undefined' &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

    const iosSafeAreaClass = isIOSDevice ? 'ios-safe-area' : ''
    const iosNavSafeAreaClass = isIOSDevice ? 'ios-nav-safe-area' : ''

    // Manifest veya SRT dosyalarını yükle
    const loadTranscriptData = useCallback(async () => {
        if (!book.audio_transcript_path) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            const transcriptUrl = book.audio_transcript_path

            // chapters.json manifest dosyasını yüklemeyi dene
            if (transcriptUrl.endsWith('.json')) {
                const response = await fetch(transcriptUrl)
                if (!response.ok) throw new Error('Manifest yüklenemedi')

                const manifest: ChaptersManifest = await response.json()

                // Her chapter'ın SRT'sini yükle
                const loadedChapters: ChapterData[] = []

                for (const ch of manifest.chapters) {
                    try {
                        const srtResponse = await fetch(ch.srtUrl)
                        if (srtResponse.ok) {
                            const srtContent = await srtResponse.text()
                            const cues = parseSrt(srtContent)

                            loadedChapters.push({
                                id: ch.id,
                                title: ch.title,
                                fileName: ch.fileName,
                                cues,
                                order: ch.order
                            })
                        }
                    } catch (err) {
                        console.warn(`Chapter SRT yüklenemedi: ${ch.fileName}`, err)
                    }
                }

                // Sırala
                loadedChapters.sort((a, b) => a.order - b.order)
                setChapters(loadedChapters)

                // manifest'te audio URL varsa kullan, yoksa book'tan al
                setAudioUrl(manifest.audioUrl || book.audio_file_path || null)
            } else if (transcriptUrl.endsWith('.srt')) {
                // Tek SRT dosyası
                const response = await fetch(transcriptUrl)
                if (!response.ok) throw new Error('SRT yüklenemedi')

                const srtContent = await response.text()
                const cues = parseSrt(srtContent)

                setChapters([{
                    id: 'main',
                    title: book.title,
                    fileName: 'main.srt',
                    cues,
                    order: 1
                }])

                setAudioUrl(book.audio_file_path || null)
            } else {
                // JSON formatı - kelime bazlı zamanlama ile parse et
                try {
                    const response = await fetch(transcriptUrl)
                    if (!response.ok) throw new Error('Transcript yüklenemedi')

                    const content = await response.text()
                    const cues = parseWordTimingJson(content)

                    if (cues.length > 0) {
                        setChapters([{
                            id: 'main',
                            title: book.title,
                            fileName: 'transcript.json',
                            cues,
                            order: 1
                        }])
                    }

                    setAudioUrl(book.audio_file_path || null)
                } catch (err) {
                    console.error('Transcript parse hatası:', err)
                    setError(t('reader.audioTranscriptError'))
                }
            }
        } catch (err) {
            console.error('Transcript yükleme hatası:', err)
            setError(t('reader.audioTranscriptError'))
        } finally {
            setLoading(false)
        }
    }, [book, t])

    useEffect(() => {
        loadTranscriptData()
    }, [loadTranscriptData])

    // Audio manifest'i yükle ve chapter audio URL'lerini ayarla
    useEffect(() => {
        const loadAudioManifest = async () => {
            if (!book.audio_file_path) return

            // Eğer audio path bir JSON manifest ise
            if (book.audio_file_path.endsWith('.json')) {
                try {
                    const response = await fetch(book.audio_file_path)
                    if (response.ok) {
                        const manifest = await response.json()

                        // Multi-chapter audio manifest ise
                        if (manifest.type === 'multi-chapter-audio' && manifest.chapters) {
                            // Chapters'a audio URL'leri ekle
                            setChapters(prev => {
                                if (prev.length === 0) return prev

                                return prev.map((ch, idx) => {
                                    // Manifest'teki chapter'ı bul (order ile eşleştir)
                                    const audioChapter = manifest.chapters.find(
                                        (ac: any) => ac.order === ch.order
                                    ) || manifest.chapters[idx]

                                    return {
                                        ...ch,
                                        audioUrl: audioChapter?.audioUrl || ch.audioUrl
                                    }
                                })
                            })

                            // İlk chapter'ın audio'sunu varsayılan olarak ayarla
                            if (manifest.chapters.length > 0) {
                                setAudioUrl(manifest.chapters[0].audioUrl)
                            }
                            return
                        }
                    }
                } catch (err) {
                    console.warn('Audio manifest yüklenemedi:', err)
                }
            }

            // Normal tek audio dosyası
            if (!audioUrl) {
                setAudioUrl(book.audio_file_path)
            }
        }

        loadAudioManifest()
    }, [book.audio_file_path, audioUrl])

    // Yükleniyor
    if (loading) {
        return (
            <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 flex items-center justify-center ${iosSafeAreaClass}`}>
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">{t('reader.audioTranscriptLoading')}</p>
                </div>
            </div>
        )
    }

    // Hata
    if (error && !audioUrl) {
        return (
            <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 flex items-center justify-center ${iosSafeAreaClass}`}>
                <div className="text-center max-w-md mx-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {t('reader.audioTranscriptError')}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={onBackToLibrary}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                    >
                        {t('app.toLibrary')}
                    </button>
                </div>
            </div>
        )
    }

    // Audio yoksa
    if (!audioUrl) {
        return (
            <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 flex items-center justify-center ${iosSafeAreaClass}`}>
                <div className="text-center max-w-md mx-4">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {t('reader.audioBook')}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {t('reader.audioTranscriptEmpty')}
                    </p>
                    <button
                        onClick={onBackToLibrary}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                    >
                        {t('app.toLibrary')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 ${iosSafeAreaClass}`}>
            {/* Header */}
            <header className={`bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg sticky top-0 z-50 ${iosNavSafeAreaClass}`}>
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onBackToLibrary}
                                className="p-2 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                                title={t('app.toLibrary')}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                                    {book.title}
                                </h1>
                                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                                    {book.author}
                                </p>
                            </div>
                        </div>

                        {toggleDarkMode && (
                            <button
                                onClick={toggleDarkMode}
                                className="p-2 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300"
                                title={isDarkMode ? t('app.light') : t('app.dark')}
                            >
                                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Player */}
            <main className="max-w-4xl mx-auto p-4">
                <AudioBookPlayer
                    audioUrl={audioUrl}
                    chapters={chapters}
                    bookTitle={book.title}
                    bookCover={book.cover_image}
                    isDarkMode={isDarkMode}
                />
            </main>
        </div>
    )
}
