/** EPUB metin araması sonuç satırı — store ve paneller arasında paylaşılır. */
export interface TextSearchResult {
  id: string
  chapterTitle: string
  snippet: string
  cfi?: string
  href?: string
}
