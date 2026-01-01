import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Play, Pause, X, Volume2, Loader2, SkipBack, SkipForward, Menu } from 'lucide-react'

const DEFAULT_SKIP_SECONDS = 15
const SKIP_OPTIONS = [5, 10, 15, 30] as const
const ALL_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.35, 1.5, 2] as const
const DEFAULT_SPEED_STEPS = [1, 1.25, 1.5, 2] as const

const HIGHLIGHT_COLORS = [
  { name: 'Amber', light: 'rgb(252, 211, 77)', dark: 'rgb(251, 191, 36)' },
  { name: 'Yellow', light: 'rgb(253, 224, 71)', dark: 'rgb(250, 204, 21)' },
  { name: 'Blue', light: 'rgb(147, 197, 253)', dark: 'rgb(96, 165, 250)' },
  { name: 'Green', light: 'rgb(134, 239, 172)', dark: 'rgb(74, 222, 128)' },
  { name: 'Pink', light: 'rgb(249, 168, 212)', dark: 'rgb(244, 114, 182)' },
  { name: 'Purple', light: 'rgb(196, 181, 253)', dark: 'rgb(167, 139, 250)' },
  { name: 'Orange', light: 'rgb(253, 186, 116)', dark: 'rgb(251, 146, 60)' },
  { name: 'Cyan', light: 'rgb(103, 232, 249)', dark: 'rgb(34, 211, 238)' },
] as const

const HIGHLIGHT_OPACITIES = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0] as const
const DEFAULT_HIGHLIGHT_COLOR = 'amber'
const DEFAULT_HIGHLIGHT_OPACITY = 0.8

interface TranscriptWord {
  word: string
  start: number
  end: number
  score?: number
}

interface TranscriptSegment {
  start: number
  end: number
  text: string
  words?: TranscriptWord[]
}

interface TranscriptData {
  segments: TranscriptSegment[]
  word_segments?: TranscriptWord[]
}

interface AudioBookPlayerProps {
  audioUrl: string
  // Transkript opsiyonel: sadece sesli kitap da destekleniyor
  transcriptUrl?: string | null
  bookTitle: string
  onClose?: () => void
}

export const AudioBookPlayer: React.FC<AudioBookPlayerProps> = ({
  audioUrl,
  transcriptUrl,
  bookTitle,
  onClose
}) => {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [transcript, setTranscript] = useState<TranscriptData | null>(null)
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(true)
  const [transcriptError, setTranscriptError] = useState<string | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null)
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([])

  const [skipSeconds, setSkipSeconds] = useState<number>(DEFAULT_SKIP_SECONDS)
  const [speedSteps, setSpeedSteps] = useState<number[]>([...DEFAULT_SPEED_STEPS])
  const [playbackRate, setPlaybackRate] = useState<number>(1)
  const [showSettings, setShowSettings] = useState(false)
  const [highlightColor, setHighlightColor] = useState<string>(DEFAULT_HIGHLIGHT_COLOR)
  const [highlightOpacity, setHighlightOpacity] = useState<number>(DEFAULT_HIGHLIGHT_OPACITY)

  useEffect(() => {
    let isMounted = true
    const loadTranscript = async () => {
      // Transkript yolu yoksa sadece ses oynatıcı olarak çalış
      if (!transcriptUrl) {
        if (!isMounted) return
        setTranscript(null)
        setTranscriptError(null)
        setIsLoadingTranscript(false)
        return
      }
      try {
        setIsLoadingTranscript(true)
        setTranscriptError(null)
        const res = await fetch(transcriptUrl)
        if (!res.ok) throw new Error(`Transcript fetch failed: ${res.status}`)
        const json = await res.json()
        if (!isMounted) return
        setTranscript(json as TranscriptData)
      } catch (err) {
        console.error('Transcript yükleme hatası:', err)
        if (isMounted) {
          setTranscriptError(t('reader.audioTranscriptError') || 'Transkript yüklenemedi')
        }
      } finally {
        if (isMounted) setIsLoadingTranscript(false)
      }
    }
    void loadTranscript()
    return () => {
      isMounted = false
    }
  }, [transcriptUrl, t])

  // Yerel ayarları yükle
  useEffect(() => {
    try {
      const savedSkip = localStorage.getItem('audioPlayer_skipSeconds')
      if (savedSkip) {
        const parsed = parseInt(savedSkip, 10)
        if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 120) {
          setSkipSeconds(parsed)
        }
      }

      const savedSpeeds = localStorage.getItem('audioPlayer_speedSteps')
      if (savedSpeeds) {
        const parsed = JSON.parse(savedSpeeds) as number[]
        const valid = parsed.filter((s) => ALL_SPEED_OPTIONS.includes(s as (typeof ALL_SPEED_OPTIONS)[number]))
        if (valid.length) {
          setSpeedSteps(valid)
        }
      }

      const savedHighlightColor = localStorage.getItem('audioPlayer_highlightColor')
      if (savedHighlightColor && HIGHLIGHT_COLORS.some((c) => c.name.toLowerCase() === savedHighlightColor.toLowerCase())) {
        setHighlightColor(savedHighlightColor.toLowerCase())
      }

      const savedHighlightOpacity = localStorage.getItem('audioPlayer_highlightOpacity')
      if (savedHighlightOpacity) {
        const parsed = parseFloat(savedHighlightOpacity)
        if (!Number.isNaN(parsed) && HIGHLIGHT_OPACITIES.includes(parsed as (typeof HIGHLIGHT_OPACITIES)[number])) {
          setHighlightOpacity(parsed)
        }
      }
    } catch {
      // sessizce geç
    }
  }, [])

  // Ayarları sakla
  useEffect(() => {
    try {
      localStorage.setItem('audioPlayer_skipSeconds', String(skipSeconds))
    } catch {
      // ignore
    }
  }, [skipSeconds])

  useEffect(() => {
    try {
      localStorage.setItem('audioPlayer_speedSteps', JSON.stringify(speedSteps))
    } catch {
      // ignore
    }
  }, [speedSteps])

  useEffect(() => {
    try {
      localStorage.setItem('audioPlayer_highlightColor', highlightColor)
    } catch {
      // ignore
    }
  }, [highlightColor])

  useEffect(() => {
    try {
      localStorage.setItem('audioPlayer_highlightOpacity', String(highlightOpacity))
    } catch {
      // ignore
    }
  }, [highlightOpacity])

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio) return

    const time = audio.currentTime
    setCurrentTime(time)

    // Transkript yoksa zaman bilgisini güncellemek yeterli
    if (!transcript?.segments?.length) return

    const segments = transcript.segments
    const prevIndex = activeSegmentIndex ?? 0
    let index = prevIndex

    if (segments[index] && time >= segments[index].start && time <= segments[index].end) {
      // aktif segment aynı kalabilir
    } else if (time > (segments[index]?.end ?? 0)) {
      while (index + 1 < segments.length && time >= segments[index + 1].start) {
        index += 1
      }
    } else if (time < (segments[index]?.start ?? 0)) {
      while (index - 1 >= 0 && time <= segments[index - 1].end) {
        index -= 1
      }
    } else {
      index = segments.findIndex((seg) => time >= seg.start && time <= seg.end)
    }

    if (index !== -1 && index !== activeSegmentIndex) {
      setActiveSegmentIndex(index)
    }
  }

  const handleLoadedMetadata = () => {
    const audio = audioRef.current
    if (!audio) return
    setDuration(audio.duration || 0)
  }

  const handlePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
    } else {
      audio.pause()
    }
  }

  const handleAudioPlay = () => setIsPlaying(true)
  const handleAudioPause = () => setIsPlaying(false)

  const handleSeek = (value: number) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const newTime = (value / 100) * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleToggleSpeed = () => {
    const audio = audioRef.current
    if (!audio) return

    const steps = speedSteps.length ? speedSteps : [...DEFAULT_SPEED_STEPS]
    const currentIndex = steps.findIndex((s) => s === playbackRate)
    const nextIndex = currentIndex === -1 || currentIndex === steps.length - 1 ? 0 : currentIndex + 1
    const nextRate = steps[nextIndex]

    if (!steps.length) return

    // Eğer steps boşsa, en azından 1x'e dön
    setPlaybackRate(nextRate)
    audio.playbackRate = nextRate
  }

  const handleSkipBackward = () => {
    const audio = audioRef.current
    if (!audio) return
    const newTime = Math.max(0, audio.currentTime - skipSeconds)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleSkipForward = () => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const newTime = Math.min(duration, audio.currentTime + skipSeconds)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || time < 0) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (activeSegmentIndex == null) return
    const el = segmentRefs.current[activeSegmentIndex]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeSegmentIndex])

  useEffect(() => {
    return () => {
      const audio = audioRef.current
      if (audio) {
        audio.pause()
      }
    }
  }, [])

  const progressPercent = useMemo(() => {
    if (!duration || duration <= 0) return 0
    return Math.min(100, Math.max(0, (currentTime / duration) * 100))
  }, [currentTime, duration])

  const activeSegment = useMemo(
    () => (activeSegmentIndex != null && transcript?.segments ? transcript.segments[activeSegmentIndex] : null),
    [activeSegmentIndex, transcript]
  )

  const getActiveWordIndex = (segment: TranscriptSegment | null): number | null => {
    if (!segment?.words?.length) return null
    const time = currentTime
    const idx = segment.words.findIndex((w) => time >= w.start && time <= w.end)
    return idx === -1 ? null : idx
  }

  const activeWordIndex = getActiveWordIndex(activeSegment)

  return (
    <div className="w-full h-full flex flex-col">
      <div className="w-full h-full bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border border-white/40 dark:border-dark-700/60 shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        {/* Üst bar */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/40 dark:border-dark-700/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              {t('reader.audioBook') || 'Sesli Kitap'}
            </p>
            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {bookTitle}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <Volume2 className="w-3 h-3" />
              <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="px-3 sm:px-4 pt-3 pb-3 md:pb-4 flex-1 flex flex-col-reverse md:flex-col-reverse gap-2 md:gap-4 min-h-0">
          {/* Mobil: Profesyonel player barı */}
          <div className="md:hidden mt-2">
            <div className="w-full rounded-3xl bg-gray-50/95 dark:bg-dark-800/95 border border-gray-200/70 dark:border-dark-700/70 shadow-md px-4 py-3 space-y-3">
              {/* Üst: zaman çizgisi */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums w-10 text-left">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progressPercent}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-dark-700 appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums w-10 text-right">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Alt: kontrol butonları */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 flex items-center justify-center"
                  aria-label="Oynatma ayarları"
                >
                  <Menu className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSkipBackward}
                  className="p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700 flex items-center justify-center"
                  aria-label="15 saniye geri"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-[1.03]"
                  aria-label={isPlaying ? 'Durdur' : 'Oynat'}
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 translate-x-[1px]" />}
                </button>

                <button
                  type="button"
                  onClick={handleSkipForward}
                  className="p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700 flex items-center justify-center"
                  aria-label="15 saniye ileri"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleSpeed}
                  className="w-12 px-0 py-1 rounded-full text-[11px] font-semibold text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 flex items-center justify-center"
                  aria-label="Oynatma hızını değiştir"
                >
                  {playbackRate.toFixed(playbackRate % 1 === 0 ? 0 : 2)}x
                </button>
              </div>
            </div>
          </div>

          {/* Masaüstü: Profesyonel player barı */}
          <div className="hidden md:flex w-full flex-col">
            <div className="w-full rounded-3xl bg-gray-50/95 dark:bg-dark-800/95 border border-gray-200/70 dark:border-dark-700/70 shadow-md px-5 py-4 space-y-4">
              {/* Üst: zaman çizgisi */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-12 text-left">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progressPercent}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-dark-700 appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-12 text-right">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Alt: kontrol butonları */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="p-2.5 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 flex items-center justify-center transition-colors"
                  aria-label="Oynatma ayarları"
                >
                  <Menu className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSkipBackward}
                  className="p-2.5 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700 flex items-center justify-center transition-colors"
                  aria-label={`${skipSeconds} saniye geri`}
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-[1.03]"
                  aria-label={isPlaying ? 'Durdur' : 'Oynat'}
                >
                  {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 translate-x-[1px]" />}
                </button>

                <button
                  type="button"
                  onClick={handleSkipForward}
                  className="p-2.5 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700 flex items-center justify-center transition-colors"
                  aria-label={`${skipSeconds} saniye ileri`}
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleSpeed}
                  className="w-14 px-0 py-1 rounded-full text-xs font-semibold text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 flex items-center justify-center transition-colors"
                  aria-label="Oynatma hızını değiştir"
                >
                  {playbackRate.toFixed(playbackRate % 1 === 0 ? 0 : 2)}x
                </button>
              </div>

              {/* Durum bilgisi */}
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200/50 dark:border-dark-700/50">
                {isLoadingTranscript && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{t('reader.audioTranscriptLoading') || 'Transkript yükleniyor...'}</span>
                  </div>
                )}
                {!isLoadingTranscript && transcriptError && (
                  <span className="text-red-500 dark:text-red-400">
                    {transcriptError}
                  </span>
                )}
                {!isLoadingTranscript && !transcriptError && transcript?.segments?.length && (
                  <span>
                    {t('reader.audioTranscriptReady') || 'Transkript yüklendi. Oynat tuşuna basın.'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Transkript veya bilgilendirme metni - Mobilde yukarıda, masaüstünde de yukarıda */}
          <div className="flex-1 min-h-0 rounded-3xl bg-gray-50/80 dark:bg-dark-800/70 border border-gray-200/80 dark:border-dark-700/60 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-4 space-y-2 text-sm text-gray-800 dark:text-gray-100">
            {isLoadingTranscript && (
              <div className="flex items-center justify-center h-24 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>{t('reader.audioTranscriptLoading') || 'Transkript yükleniyor...'}</span>
              </div>
            )}
            {!isLoadingTranscript && transcriptError && (
              <div className="text-xs text-red-500 dark:text-red-400">
                {transcriptError}
              </div>
            )}
            {!isLoadingTranscript && !transcriptError && (!transcript?.segments || transcript.segments.length === 0) && (
              <div className="h-full flex items-center justify-center">
                <div className="max-w-sm text-center bg-white/80 dark:bg-dark-900/80 rounded-xl px-4 py-5 shadow-sm border border-gray-200/70 dark:border-dark-700/70">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {t('reader.audioTranscriptEmpty') || 'Bu metin için hazırlanmış bir transkript bulunmuyor.'}
                  </p>
                </div>
              </div>
            )}
            {transcript?.segments?.map((segment, index) => {
              const isActive = index === activeSegmentIndex
              const localActiveWordIndex =
                isActive && activeWordIndex != null ? activeWordIndex : null
              return (
                <div
                  key={`${segment.start}-${segment.end}-${index}`}
                  ref={(el) => { segmentRefs.current[index] = el }}
                  className={`
                    rounded-lg px-2 py-1.5 transition-colors cursor-default
                    ${isActive
                      ? 'bg-blue-50 dark:bg-blue-900/40 text-gray-900 dark:text-gray-50 shadow-sm'
                      : 'hover:bg-gray-100/70 dark:hover:bg-dark-700/70 text-gray-800 dark:text-gray-100'}
                  `}
                >
                  {segment.words && segment.words.length > 0 ? (
                    <p className="text-[13px] leading-relaxed">
                      {segment.words.map((w, wIdx) => {
                        const isWordActive = wIdx === localActiveWordIndex
                        const colorConfig = HIGHLIGHT_COLORS.find((c) => c.name.toLowerCase() === highlightColor) || HIGHLIGHT_COLORS[0]
                        const isDarkMode = document.documentElement.classList.contains('dark')
                        const color = isDarkMode ? colorConfig.dark : colorConfig.light
                        return (
                          <span
                            key={`${w.word}-${w.start}-${wIdx}`}
                            className="px-0.5 rounded-sm"
                            style={
                              isWordActive
                                ? {
                                    backgroundColor: color.replace('rgb', 'rgba').replace(')', `, ${highlightOpacity})`),
                                  }
                                : undefined
                            }
                          >
                            {w.word}
                            {' '}
                          </span>
                        )
                      })}
                    </p>
                  ) : (
                    <p className="text-[13px] leading-relaxed">
                      {segment.text}
                    </p>
                  )}
                </div>
              )
            })}
            </div>
          </div>
        </div>

        {/* Ayarlar Modalı */}
        {showSettings && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowSettings(false)}>
            <div className="w-full max-w-sm max-h-[90vh] rounded-xl bg-white dark:bg-dark-900 shadow-lg border border-gray-200 dark:border-dark-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-800 flex items-center justify-between flex-shrink-0">
                <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('reader.audioSettings') || 'Ayarlar'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="Ayarları kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 py-4 space-y-5 overflow-y-auto flex-1 min-h-0">
                {/* Sarma süresi */}
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {t('reader.skipDuration') || 'Sarma süresi'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SKIP_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSkipSeconds(s)}
                        className={`px-2.5 py-1 text-xs rounded-md ${
                          skipSeconds === s
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-700'
                        }`}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hız presetleri */}
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {t('reader.playbackSpeeds') || 'Oynatma hızları'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SPEED_OPTIONS.map((s) => {
                      const isActive = speedSteps.includes(s)
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSpeedSteps((prev) => {
                              const exists = prev.includes(s)
                              const next = exists ? prev.filter((v) => v !== s) : [...prev, s]
                              // En az bir hız mutlaka kalsın
                              return next.length ? next.sort((a, b) => a - b) : [1]
                            })
                          }}
                          className={`px-2.5 py-1 text-xs rounded-md ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-700'
                          }`}
                        >
                          {s.toFixed(s % 1 === 0 ? 0 : 2)}x
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Highlight ayarları */}
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {t('reader.highlightColor') || 'Vurgulama rengi'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {HIGHLIGHT_COLORS.map((color) => {
                      const isActive = color.name.toLowerCase() === highlightColor
                      const colorKey = `reader.color${color.name}` as any
                      const colorLabel = t(colorKey) || color.name
                      return (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => setHighlightColor(color.name.toLowerCase())}
                          className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-700'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color.light }}
                          />
                          {colorLabel}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {t('reader.highlightOpacity') || 'Vurgu saydamlığı'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {HIGHLIGHT_OPACITIES.map((opacity) => {
                      const isActive = highlightOpacity === opacity
                      return (
                        <button
                          key={opacity}
                          type="button"
                          onClick={() => setHighlightOpacity(opacity)}
                          className={`px-2.5 py-1 text-xs rounded-md ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-700'
                          }`}
                        >
                          {Math.round(opacity * 100)}%
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handleAudioPlay}
          onPause={handleAudioPause}
          className="hidden"
          controls={false}
        />
      </div>
    </div>
  )
}


