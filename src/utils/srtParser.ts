/**
 * SRT Parser Utility
 * ElevenLabs SRT ve JSON formatındaki altyazı dosyalarını parse eder
 */

export interface Word {
    word: string
    start: number  // seconds
    end: number    // seconds
    score?: number
}

export interface SrtCue {
    index: number
    startTime: number  // seconds
    endTime: number    // seconds
    text: string
    words?: Word[]  // Kelime bazlı zamanlama (opsiyonel)
}

export interface Chapter {
    id: string
    title: string
    fileName: string
    cues: SrtCue[]
    startTime: number  // chapter'ın audio içindeki başlangıç zamanı
    endTime: number    // chapter'ın audio içindeki bitiş zamanı
}

export interface ChaptersManifest {
    version: string
    audioUrl: string
    chapters: {
        id: string
        title: string
        fileName: string
        srtUrl: string
        order: number
    }[]
}

/**
 * SRT zaman damgasını saniyeye çevirir
 * Format: "00:01:23,456" -> 83.456
 */
export function parseTimeToSeconds(time: string): number {
    const match = time.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
    if (!match) return 0

    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const seconds = parseInt(match[3], 10)
    const milliseconds = parseInt(match[4], 10)

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

/**
 * Saniyeyi SRT formatına çevirir
 * Format: 83.456 -> "00:01:23,456"
 */
export function secondsToTimeString(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const milliseconds = Math.round((totalSeconds % 1) * 1000)

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

/**
 * SRT metnini temizler
 * - <break time="X"/> gibi etiketleri kaldırır
 * - Gereksiz boşlukları temizler
 */
export function cleanSrtText(text: string): string {
    return text
        .replace(/<break[^>]*\/>/gi, '') // <break time="1.6s"/> gibi etiketleri kaldır
        .replace(/<[^>]+>/g, '') // Diğer HTML etiketlerini kaldır
        .replace(/\s+/g, ' ') // Çoklu boşlukları tek boşluğa çevir
        .trim()
}

/**
 * SRT dosya içeriğini parse eder
 */
export function parseSrt(content: string): SrtCue[] {
    const cues: SrtCue[] = []

    // Normalize line endings
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // SRT dosyasını bloklara ayır (boş satırlarla ayrılmış)
    const blocks = normalizedContent.split(/\n\n+/).filter(block => block.trim())

    for (const block of blocks) {
        const lines = block.split('\n').filter(line => line.trim())

        if (lines.length < 2) continue

        // İlk satır: index numarası
        const indexLine = lines[0].trim()
        const index = parseInt(indexLine, 10)
        if (isNaN(index)) continue

        // İkinci satır: zaman aralığı
        const timeLine = lines[1].trim()
        const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/)
        if (!timeMatch) continue

        const startTime = parseTimeToSeconds(timeMatch[1])
        const endTime = parseTimeToSeconds(timeMatch[2])

        // Geri kalan satırlar: metin
        const textLines = lines.slice(2)
        const rawText = textLines.join(' ')
        const text = cleanSrtText(rawText)

        if (text) {
            cues.push({
                index,
                startTime,
                endTime,
                text
            })
        }
    }

    return cues
}

/**
 * ElevenLabs JSON formatını parse eder (kelime bazlı zamanlama ile)
 * Format: { segments: [{ start, end, text, words: [{ word, start, end }] }] }
 */
export function parseWordTimingJson(content: string): SrtCue[] {
    try {
        const data = JSON.parse(content)
        const cues: SrtCue[] = []

        if (!data.segments || !Array.isArray(data.segments)) {
            return cues
        }

        data.segments.forEach((seg: any, idx: number) => {
            const words: Word[] = []

            if (seg.words && Array.isArray(seg.words)) {
                seg.words.forEach((w: any) => {
                    words.push({
                        word: w.word || '',
                        start: w.start || 0,
                        end: w.end || 0,
                        score: w.score
                    })
                })
            }

            cues.push({
                index: idx + 1,
                startTime: seg.start || 0,
                endTime: seg.end || 0,
                text: (seg.text || '').trim(),
                words: words.length > 0 ? words : undefined
            })
        })

        return cues
    } catch (e) {
        console.error('JSON parse hatası:', e)
        return []
    }
}

/**
 * Mevcut zaman için hangi kelimenin aktif olduğunu bulur
 */
export function findActiveWordIndex(words: Word[], currentTime: number): number {
    for (let i = 0; i < words.length; i++) {
        if (currentTime >= words[i].start && currentTime <= words[i].end) {
            return i
        }
    }

    // Eğer tam aralıkta değilse, en yakın sonraki kelimeyi bul
    for (let i = 0; i < words.length; i++) {
        if (currentTime < words[i].start) {
            return Math.max(0, i - 1)
        }
    }

    return words.length - 1
}

/**
 * Dosya adından chapter başlığı çıkarır
 * Örn: "01_Uhuvvet_Risalesi.srt" -> "Uhuvvet Risalesi"
 */
export function extractChapterTitle(fileName: string): string {
    // Uzantıyı kaldır
    let name = fileName.replace(/\.srt$/i, '')

    // Başındaki sayı ve alt çizgiyi kaldır
    name = name.replace(/^\d+_/, '')

    // Alt çizgileri boşluğa çevir
    name = name.replace(/_/g, ' ')

    return name.trim() || fileName
}

/**
 * Dosya adından sıra numarasını çıkarır
 * Örn: "01_Uhuvvet_Risalesi.srt" -> 1
 */
export function extractChapterOrder(fileName: string): number {
    const match = fileName.match(/^(\d+)/)
    return match ? parseInt(match[1], 10) : 999
}

/**
 * Mevcut zaman için hangi cue'nun aktif olduğunu bulur
 */
export function findActiveCue(cues: SrtCue[], currentTime: number): SrtCue | null {
    for (const cue of cues) {
        if (currentTime >= cue.startTime && currentTime <= cue.endTime) {
            return cue
        }
    }
    return null
}

/**
 * Mevcut zaman için hangi cue'nun aktif olduğunun index'ini bulur
 */
export function findActiveCueIndex(cues: SrtCue[], currentTime: number): number {
    for (let i = 0; i < cues.length; i++) {
        if (currentTime >= cues[i].startTime && currentTime <= cues[i].endTime) {
            return i
        }
    }

    // Eğer tam aralıkta değilse, en yakın sonraki cue'yu bul
    for (let i = 0; i < cues.length; i++) {
        if (currentTime < cues[i].startTime) {
            return Math.max(0, i - 1)
        }
    }

    return cues.length - 1
}

/**
 * Chapters manifest'inden chapter listesi oluşturur
 * Her chapter için offset hesaplar (ardışık sayılar için)
 */
export function calculateChapterOffsets(
    chapters: { id: string; title: string; fileName: string; cues: SrtCue[] }[]
): Chapter[] {
    let currentOffset = 0

    return chapters.map((ch) => {
        const startTime = currentOffset
        const duration = ch.cues.length > 0
            ? ch.cues[ch.cues.length - 1].endTime
            : 0
        const endTime = startTime + duration

        // Sonraki chapter için offset'i güncelle
        currentOffset = endTime

        return {
            id: ch.id,
            title: ch.title,
            fileName: ch.fileName,
            cues: ch.cues,
            startTime,
            endTime
        }
    })
}

/**
 * Verilen zaman için hangi chapter'da olduğumuzu bulur
 */
export function findActiveChapter(chapters: Chapter[], currentTime: number): Chapter | null {
    for (const chapter of chapters) {
        if (currentTime >= chapter.startTime && currentTime < chapter.endTime) {
            return chapter
        }
    }
    return chapters.length > 0 ? chapters[chapters.length - 1] : null
}

/**
 * Chapter içindeki relative time'ı hesaplar
 */
export function getRelativeTimeInChapter(chapter: Chapter, absoluteTime: number): number {
    return absoluteTime - chapter.startTime
}
