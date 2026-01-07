import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  List,
  Settings,
  Volume2,
  VolumeX,
  X
} from 'lucide-react'
import { type SrtCue, findActiveCueIndex, findActiveWordIndex } from '../utils/srtParser'

interface ChapterData {
  id: string
  title: string
  fileName: string
  cues: SrtCue[]
  order: number
  audioUrl?: string  // Chapter'a özel audio URL (opsiyonel)
}

interface AudioBookPlayerProps {
  audioUrl: string
  chapters: ChapterData[]
  bookTitle: string
  bookCover?: string
  isDarkMode?: boolean
}

export const AudioBookPlayer: React.FC<AudioBookPlayerProps> = ({
  audioUrl,
  chapters,
  bookTitle,
  bookCover
}) => {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const activeCueRef = useRef<HTMLDivElement>(null)

  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [skipDuration, setSkipDuration] = useState(10)
  const [showChapters, setShowChapters] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeChapterIndex, setActiveChapterIndex] = useState(0)
  const [activeCueIndex, setActiveCueIndex] = useState(-1)
  const [activeWordIndex, setActiveWordIndex] = useState(-1)
  const [autoScroll, setAutoScroll] = useState(true)
  const [syncOffset, setSyncOffset] = useState(0) // Senkron ayarı: negatif = yazı geride, pozitif = yazı ileride
  const [currentAudioUrl, setCurrentAudioUrl] = useState(audioUrl)
  const [pendingPlay, setPendingPlay] = useState(false) // Audio yüklendikten sonra otomatik oynat

  // Mevcut chapter
  const currentChapter = chapters[activeChapterIndex] || null

  // Chapter'a özel audio varsa, chapter değiştiğinde audio'yu değiştir
  const hasChapterAudio = chapters.some(ch => ch.audioUrl)

  useEffect(() => {
    if (hasChapterAudio && currentChapter?.audioUrl) {
      setCurrentAudioUrl(currentChapter.audioUrl)
    } else {
      setCurrentAudioUrl(audioUrl)
    }
  }, [activeChapterIndex, currentChapter, hasChapterAudio, audioUrl])

  // Chapter başlangıç zamanlarını hesapla
  const chapterStartTimes = useRef<number[]>([])

  useEffect(() => {
    if (!chapters.length) return

    // Eğer her chapter'ın kendi audio'su varsa, her biri 0'dan başlar
    if (hasChapterAudio) {
      chapterStartTimes.current = chapters.map(() => 0)
      return
    }

    // Tek audio dosyası için birikimli offset hesapla
    let offset = 0
    const times: number[] = []

    for (const ch of chapters) {
      times.push(offset)
      if (ch.cues.length > 0) {
        offset += ch.cues[ch.cues.length - 1].endTime
      }
    }

    chapterStartTimes.current = times
  }, [chapters, hasChapterAudio])

  // Time update handler
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return

    const time = audioRef.current.currentTime
    setCurrentTime(time)

    // Senkron offset'i uygula: pozitif değer yazıyı yavaşlatır (audio'dan geride kalır)
    const adjustedTime = time + syncOffset

    // Multi-audio modda: chapter değişimi manuel, sadece cue takip et
    if (hasChapterAudio) {
      const chapter = chapters[activeChapterIndex]
      if (chapter) {
        const cueIdx = findActiveCueIndex(chapter.cues, adjustedTime)

        if (cueIdx !== activeCueIndex) {
          setActiveCueIndex(cueIdx)
          setActiveWordIndex(-1)
        }

        // Kelime bazlı highlight
        const activeCue = chapter.cues[cueIdx]
        if (activeCue?.words && activeCue.words.length > 0) {
          const wordIdx = findActiveWordIndex(activeCue.words, adjustedTime)
          if (wordIdx !== activeWordIndex) {
            setActiveWordIndex(wordIdx)
          }
        }
      }
      return
    }

    // Tek audio modda: hangi chapter'dayız?
    let chapterIdx = 0
    for (let i = 0; i < chapterStartTimes.current.length; i++) {
      if (adjustedTime >= chapterStartTimes.current[i]) {
        chapterIdx = i
      }
    }

    if (chapterIdx !== activeChapterIndex) {
      setActiveChapterIndex(chapterIdx)
    }

    // Chapter içindeki relative time
    const chapter = chapters[chapterIdx]
    if (chapter) {
      const relativeTime = adjustedTime - (chapterStartTimes.current[chapterIdx] || 0)
      const cueIdx = findActiveCueIndex(chapter.cues, relativeTime)

      if (cueIdx !== activeCueIndex) {
        setActiveCueIndex(cueIdx)
        setActiveWordIndex(-1) // Yeni cue'ya geçtiğimizde word index'i sıfırla
      }

      // Kelime bazlı highlight için aktif kelimeyi bul
      const activeCue = chapter.cues[cueIdx]
      if (activeCue?.words && activeCue.words.length > 0) {
        const wordIdx = findActiveWordIndex(activeCue.words, adjustedTime)
        if (wordIdx !== activeWordIndex) {
          setActiveWordIndex(wordIdx)
        }
      }
    }
  }, [activeChapterIndex, activeCueIndex, activeWordIndex, chapters, syncOffset])

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoadedMetadata = () => {
      setDuration(audio.duration)
      setCurrentTime(0) // Reset current time when new audio loads
    }

    const onCanPlay = () => {
      // Eğer bekleyen bir play isteği varsa, şimdi oynat
      if (pendingPlay) {
        setPendingPlay(false)
        audio.currentTime = 0 // Baştan başla
        audio.play().catch(() => {
          // Kullanıcı etkileşimi gerekebilir
        })
      }
    }

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    const onEnded = () => {
      // Multi-audio modda: sonraki chapter'a geç
      if (hasChapterAudio && activeChapterIndex < chapters.length - 1) {
        setActiveChapterIndex(prev => prev + 1)
        setActiveCueIndex(-1)
        setActiveWordIndex(-1)
        setPendingPlay(true) // Otomatik oynat
      } else {
        setIsPlaying(false)
      }
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [handleTimeUpdate, pendingPlay, hasChapterAudio, activeChapterIndex, chapters.length])

  // Auto-scroll to active cue
  useEffect(() => {
    if (!autoScroll || !activeCueRef.current || !transcriptRef.current) return

    activeCueRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }, [activeCueIndex, autoScroll])

  // Playback rate değiştiğinde
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  // Volume değiştiğinde
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Kontrol fonksiyonları
  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(console.error)
    }
  }

  const skip = (seconds: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds))
  }

  const seek = (time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
  }

  const goToChapter = (index: number) => {
    if (!audioRef.current || index < 0 || index >= chapters.length) return

    const wasPlaying = isPlaying

    // Multi-audio modda: önce pause, sonra chapter değiştir
    if (hasChapterAudio) {
      audioRef.current.pause()
      setActiveChapterIndex(index)
      setActiveCueIndex(-1)
      setActiveWordIndex(-1)
      setShowChapters(false)

      // Audio kaynağı useEffect ile değişecek, canplay event'inde oynat
      if (wasPlaying) {
        setPendingPlay(true)
      }
      return
    }

    // Tek audio modda: normal davranış
    const startTime = chapterStartTimes.current[index] || 0
    audioRef.current.currentTime = startTime
    setActiveChapterIndex(index)
    setShowChapters(false)

    // Oynatmıyorsa başlat
    if (!isPlaying) {
      audioRef.current.play().catch(console.error)
    }
  }

  const goToCue = (cueIndex: number) => {
    if (!audioRef.current || !currentChapter) return

    const cue = currentChapter.cues[cueIndex]
    if (!cue) return

    const chapterStartTime = chapterStartTimes.current[activeChapterIndex] || 0
    audioRef.current.currentTime = chapterStartTime + cue.startTime

    setAutoScroll(false) // Kullanıcı tıkladığında auto-scroll'u kapat
    setTimeout(() => setAutoScroll(true), 3000) // 3 saniye sonra tekrar aç

    if (!isPlaying) {
      audioRef.current.play().catch(console.error)
    }
  }

  // Format zaman
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00'

    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Chapter içindeki ilerleme
  const getChapterProgress = (): number => {
    if (!currentChapter || currentChapter.cues.length === 0) return 0

    // Multi-audio modda currentTime zaten chapter'a relative
    if (hasChapterAudio) {
      return Math.min(100, Math.max(0, (currentTime / duration) * 100))
    }

    const chapterStartTime = chapterStartTimes.current[activeChapterIndex] || 0
    const relativeTime = currentTime - chapterStartTime
    const chapterDuration = currentChapter.cues[currentChapter.cues.length - 1].endTime

    return Math.min(100, Math.max(0, (relativeTime / chapterDuration) * 100))
  }

  // Her chapter'ın SRT'den hesaplanan süresi
  const getChapterDuration = (chapter: ChapterData): number => {
    if (!chapter.cues || chapter.cues.length === 0) return 0
    return chapter.cues[chapter.cues.length - 1].endTime
  }

  // Toplam kitap süresi (tüm chapter'ların SRT sürelerinin toplamı)
  const getTotalBookDuration = (): number => {
    return chapters.reduce((total, ch) => total + getChapterDuration(ch), 0)
  }

  // Şu ana kadar geçen toplam süre (tamamlanan chapter'lar + mevcut chapter'daki ilerleme)
  const getElapsedTime = (): number => {
    let elapsed = 0

    // Tamamlanan chapter'ların süreleri
    for (let i = 0; i < activeChapterIndex; i++) {
      elapsed += getChapterDuration(chapters[i])
    }

    // Mevcut chapter'daki ilerleme
    elapsed += currentTime

    return elapsed
  }

  // Toplam kitap ilerlemesi (gerçek zamana dayalı)
  const getTotalBookProgress = (): number => {
    const totalDuration = getTotalBookDuration()
    if (totalDuration === 0) return 0

    return Math.min(100, Math.max(0, (getElapsedTime() / totalDuration) * 100))
  }

  return (
    <div className="relative flex flex-col gap-4">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={currentAudioUrl} preload="metadata" />

      {/* Transcript Panel - Üstte */}
      {currentChapter && currentChapter.cues.length > 0 && (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 dark:border-dark-700/30 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700/30 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {chapters.length > 1 ? currentChapter.title : t('reader.audioBook')}
            </h3>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`text-xs px-2 py-1 rounded-lg ${autoScroll
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400'
                }`}
            >
              {autoScroll ? '↓ Auto' : '↓'}
            </button>
          </div>

          <div
            ref={transcriptRef}
            className="p-4 max-h-[400px] overflow-y-auto space-y-2"
          >
            {currentChapter.cues.map((cue, idx) => (
              <div
                key={cue.index}
                ref={idx === activeCueIndex ? activeCueRef : undefined}
                onClick={() => goToCue(idx)}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${idx === activeCueIndex
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 shadow-md scale-[1.01]'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-700/50 text-gray-700 dark:text-gray-300'
                  }`}
              >
                <p className={`text-sm md:text-base leading-relaxed ${idx === activeCueIndex ? 'font-medium' : ''}`}>
                  {/* Kelime bazlı highlight varsa */}
                  {idx === activeCueIndex && cue.words && cue.words.length > 0 ? (
                    cue.words.map((word, wordIdx) => (
                      <span
                        key={wordIdx}
                        className={`transition-colors duration-150 ${wordIdx <= activeWordIndex
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-emerald-900/50 dark:text-emerald-100/50'
                          } ${wordIdx === activeWordIndex ? 'font-bold' : ''}`}
                      >
                        {word.word}{' '}
                      </span>
                    ))
                  ) : (
                    <span className={idx === activeCueIndex ? 'text-emerald-900 dark:text-emerald-100' : ''}>
                      {cue.text}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Player Card - Altta */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 dark:border-dark-700/30 overflow-hidden">
        {/* Book Info Header */}
        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-dark-700/30">
          <div className="flex items-start gap-4">
            {bookCover ? (
              <img
                src={bookCover}
                alt={bookTitle}
                className="w-16 h-20 md:w-20 md:h-28 object-cover rounded-lg shadow-lg flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-20 md:w-20 md:h-28 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg shadow-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-2xl font-bold">♪</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 line-clamp-2">
                {bookTitle}
              </h2>
              {chapters.length > 1 && currentChapter && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                  {t('audiobook.chapter')} {activeChapterIndex + 1}: {currentChapter.title}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                  {t('reader.audioBook')}
                </span>
                {chapters.length > 1 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {chapters.length} {t('audiobook.chapters')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 md:p-6 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div
              className="h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const percent = (e.clientX - rect.left) / rect.width
                seek(percent * duration)
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-100"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-4">
            {/* Skip Back */}
            <button
              onClick={() => skip(-skipDuration)}
              className="p-3 rounded-full bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300 transition-colors"
              title={`${skipDuration}s ${t('reader.previous')}`}
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skip(skipDuration)}
              className="p-3 rounded-full bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300 transition-colors"
              title={`${skipDuration}s ${t('reader.next')}`}
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Secondary Controls */}
          <div className="flex items-center justify-between">
            {/* Playback Speed */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaybackRate(prev => {
                  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
                  const idx = speeds.indexOf(prev)
                  return speeds[(idx + 1) % speeds.length]
                })}
                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                {playbackRate}x
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400 transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 accent-emerald-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {chapters.length > 1 && (
                <button
                  onClick={() => setShowChapters(!showChapters)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400 transition-colors"
                  title={t('audiobook.chapters')}
                >
                  <List className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400 transition-colors"
                title={t('reader.audioSettings')}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Chapter/Book Progress (if multi-chapter) */}
        {chapters.length > 1 && currentChapter && (
          <div className="px-4 md:px-6 pb-4 space-y-2">
            {/* Multi-audio modda: toplam kitap ilerlemesi */}
            {hasChapterAudio ? (
              <>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{t('audiobook.chapter')} {activeChapterIndex + 1}/{chapters.length}</span>
                  <span>{formatTime(getElapsedTime())} / {formatTime(getTotalBookDuration())}</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                    style={{ width: `${getTotalBookProgress()}%` }}
                  />
                </div>
              </>
            ) : (
              /* Tek audio modda: chapter içi ilerleme */
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{t('audiobook.chapter')} {activeChapterIndex + 1}/{chapters.length}</span>
                <div className="flex-1 h-1 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-300 dark:bg-emerald-600 rounded-full transition-all"
                    style={{ width: `${getChapterProgress()}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chapters Modal */}
      {showChapters && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 mb-4 md:mb-0 bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700 max-h-[70vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t('audiobook.chapters')}
              </h3>
              <button
                onClick={() => setShowChapters(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[50vh]">
              {chapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => goToChapter(idx)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-700/50 border-b border-gray-100 dark:border-dark-700/50 last:border-b-0 transition-colors ${idx === activeChapterIndex ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${idx === activeChapterIndex
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 dark:bg-dark-600 text-gray-600 dark:text-gray-300'
                      }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${idx === activeChapterIndex
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-gray-900 dark:text-gray-100'
                        }`}>
                        {ch.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {ch.cues.length} {t('reader.paragraph').toLowerCase()}
                      </p>
                    </div>
                    {idx === activeChapterIndex && (
                      <span className="text-emerald-500">
                        <Play className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 mb-4 md:mb-0 bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t('reader.audioSettings')}
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Skip Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('reader.skipDuration')}
                </label>
                <div className="flex gap-2">
                  {[5, 10, 15, 30].map(sec => (
                    <button
                      key={sec}
                      onClick={() => setSkipDuration(sec)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${skipDuration === sec
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                        }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Playback Speed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('reader.playbackSpeeds')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackRate(speed)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${playbackRate === speed
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                        }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Sync Offset */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('audiobook.syncOffset', 'Yazı Senkronu')}
                </label>
                <div className="space-y-3">
                  {/* Offset değeri ve reset */}
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-lg font-bold ${syncOffset === 0 ? 'text-gray-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {syncOffset > 0 ? '+' : ''}{syncOffset}s
                    </span>
                    {syncOffset !== 0 && (
                      <button
                        onClick={() => setSyncOffset(0)}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-dark-700 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600"
                      >
                        {t('reader.reset', 'Sıfırla')}
                      </button>
                    )}
                  </div>

                  {/* +/- Butonları */}
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setSyncOffset(prev => prev - 1)}
                      className="px-2 py-2 bg-gray-100 dark:bg-dark-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600 font-medium text-sm"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => setSyncOffset(prev => prev - 0.5)}
                      className="px-2 py-2 bg-gray-100 dark:bg-dark-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600 font-medium text-sm"
                    >
                      -0.5
                    </button>
                    <button
                      onClick={() => setSyncOffset(prev => prev - 0.25)}
                      className="px-2 py-2 bg-gray-100 dark:bg-dark-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600 font-medium text-sm"
                    >
                      -0.25
                    </button>
                    <button
                      onClick={() => setSyncOffset(prev => prev + 0.25)}
                      className="px-2 py-2 bg-gray-100 dark:bg-dark-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600 font-medium text-sm"
                    >
                      +0.25
                    </button>
                    <button
                      onClick={() => setSyncOffset(prev => prev + 0.5)}
                      className="px-2 py-2 bg-gray-100 dark:bg-dark-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600 font-medium text-sm"
                    >
                      +0.5
                    </button>
                    <button
                      onClick={() => setSyncOffset(prev => prev + 1)}
                      className="px-2 py-2 bg-gray-100 dark:bg-dark-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600 font-medium text-sm"
                    >
                      +1
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {t('audiobook.syncOffsetHint', 'Yazı ileride gidiyorsa negatif, geride kalıyorsa pozitif değer ayarlayın')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
