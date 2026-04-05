/**
 * bookCacheService — Offline-First EPUB Önbelleği
 *
 * Web    → IndexedDB (idb-keyval benzeri minimal wrapper)
 * Mobil  → Capacitor Filesystem (Documents dizini)
 *
 * Kullanım:
 *   const localUrl = await resolveBookUrl(remoteUrl, bookId)
 *   // → Blob URL (web) veya file:// (mobil); EPUB.js'e doğrudan verilebilir
 *
 * Sessiz güncelleme:
 *   checkAndUpdateInBackground(remoteUrl, bookId) — fire-and-forget;
 *   Content-Hash farklıysa arka planda indir, sonraki açılışta güncellenir.
 */

// ─── Platform tespiti ────────────────────────────────────────────────────────
function isCapacitorNative(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
        ?.isNativePlatform?.()
  )
}

// ─── IndexedDB yardımcıları (Web) ───────────────────────────────────────────
const IDB_DB_NAME = 'epub-book-cache'
const IDB_STORE_BOOKS = 'books'
const IDB_STORE_META = 'meta'
const IDB_VERSION = 1

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(IDB_STORE_BOOKS)) {
        db.createObjectStore(IDB_STORE_BOOKS)
      }
      if (!db.objectStoreNames.contains(IDB_STORE_META)) {
        db.createObjectStore(IDB_STORE_META)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(store: string, key: string, value: unknown): Promise<void> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ─── İçerik hash (ETag / Content-Length) ────────────────────────────────────
interface BookMeta {
  etag?: string
  contentLength?: string
  cachedAt: number
}

async function fetchRemoteMeta(url: string): Promise<{ etag?: string; contentLength?: string }> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    if (!res.ok) return {}
    return {
      etag: res.headers.get('ETag') ?? undefined,
      contentLength: res.headers.get('Content-Length') ?? undefined,
    }
  } catch {
    return {}
  }
}

function metaKey(bookId: string) {
  return `meta:${bookId}`
}
function bookKey(bookId: string) {
  return `book:${bookId}`
}

// ─── Web (IndexedDB) implementasyonu ────────────────────────────────────────
async function webGetCachedBlobUrl(bookId: string): Promise<string | null> {
  try {
    const buf = await idbGet<ArrayBuffer>(IDB_STORE_BOOKS, bookKey(bookId))
    if (!buf) return null
    const blob = new Blob([buf], { type: 'application/epub+zip' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

async function webCacheBook(remoteUrl: string, bookId: string): Promise<string | null> {
  try {
    const res = await fetch(remoteUrl)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    await idbSet(IDB_STORE_BOOKS, bookKey(bookId), buf)

    const etag = res.headers.get('ETag') ?? undefined
    const contentLength = res.headers.get('Content-Length') ?? undefined
    const meta: BookMeta = { etag, contentLength, cachedAt: Date.now() }
    await idbSet(IDB_STORE_META, metaKey(bookId), meta)

    const blob = new Blob([buf], { type: 'application/epub+zip' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

async function webSilentUpdate(remoteUrl: string, bookId: string): Promise<void> {
  try {
    const [meta, remoteMeta] = await Promise.all([
      idbGet<BookMeta>(IDB_STORE_META, metaKey(bookId)),
      fetchRemoteMeta(remoteUrl),
    ])
    if (!meta) return // Henüz hiç önbelleklenmemiş

    // ETag veya Content-Length farklıysa güncelle
    const changed =
      (remoteMeta.etag && meta.etag && remoteMeta.etag !== meta.etag) ||
      (remoteMeta.contentLength &&
        meta.contentLength &&
        remoteMeta.contentLength !== meta.contentLength)

    if (!changed) return

    const res = await fetch(remoteUrl)
    if (!res.ok) return
    const buf = await res.arrayBuffer()
    await idbSet(IDB_STORE_BOOKS, bookKey(bookId), buf)
    const newMeta: BookMeta = {
      etag: res.headers.get('ETag') ?? undefined,
      contentLength: res.headers.get('Content-Length') ?? undefined,
      cachedAt: Date.now(),
    }
    await idbSet(IDB_STORE_META, metaKey(bookId), newMeta)
    console.log(`[BookCache] ${bookId} arka planda güncellendi`)
  } catch {
    // Sessiz başarısızlık: ağ yoksa veya IDB doluysa hata atma
  }
}

// ─── Mobil (Capacitor Filesystem) implementasyonu ───────────────────────────
interface CapFilesystem {
  writeFile(opts: {
    path: string
    data: string
    directory: string
    encoding?: string
    recursive?: boolean
  }): Promise<void>
  readFile(opts: { path: string; directory: string; encoding?: string }): Promise<{ data: string }>
  stat(opts: { path: string; directory: string }): Promise<unknown>
  deleteFile(opts: { path: string; directory: string }): Promise<void>
}

function getCapFilesystem(): CapFilesystem | null {
  const cap = (window as unknown as { Capacitor?: { Plugins?: { Filesystem?: CapFilesystem } } })
    .Capacitor
  return cap?.Plugins?.Filesystem ?? null
}

const CAP_DIR = 'DOCUMENTS'
const CAP_SUBDIR = 'epub-cache'

function capPath(bookId: string) {
  return `${CAP_SUBDIR}/${bookId}.epub`
}
function capMetaPath(bookId: string) {
  return `${CAP_SUBDIR}/${bookId}.meta.json`
}

async function capGetCachedUrl(bookId: string): Promise<string | null> {
  const fs = getCapFilesystem()
  if (!fs) return null
  try {
    await fs.stat({ path: capPath(bookId), directory: CAP_DIR })
    // Capacitor'da file:// URL'e ihtiyaç yok; Blob üretilir
    const { data } = await fs.readFile({ path: capPath(bookId), directory: CAP_DIR })
    const byteStr = atob(data)
    const byteArr = new Uint8Array(byteStr.length)
    for (let i = 0; i < byteStr.length; i++) byteArr[i] = byteStr.charCodeAt(i)
    const blob = new Blob([byteArr], { type: 'application/epub+zip' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

async function capCacheBook(remoteUrl: string, bookId: string): Promise<string | null> {
  const fs = getCapFilesystem()
  if (!fs) return null
  try {
    const res = await fetch(remoteUrl)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const byteArr = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < byteArr.length; i++) binary += String.fromCharCode(byteArr[i])
    const b64 = btoa(binary)

    await fs.writeFile({
      path: capPath(bookId),
      data: b64,
      directory: CAP_DIR,
      recursive: true,
    })

    const meta: BookMeta = {
      etag: res.headers.get('ETag') ?? undefined,
      contentLength: res.headers.get('Content-Length') ?? undefined,
      cachedAt: Date.now(),
    }
    await fs.writeFile({
      path: capMetaPath(bookId),
      data: JSON.stringify(meta),
      directory: CAP_DIR,
    })

    const blob = new Blob([buf], { type: 'application/epub+zip' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

async function capSilentUpdate(remoteUrl: string, bookId: string): Promise<void> {
  const fs = getCapFilesystem()
  if (!fs) return
  try {
    const { data: metaJson } = await fs.readFile({
      path: capMetaPath(bookId),
      directory: CAP_DIR,
    })
    const meta = JSON.parse(metaJson) as BookMeta
    const remoteMeta = await fetchRemoteMeta(remoteUrl)

    const changed =
      (remoteMeta.etag && meta.etag && remoteMeta.etag !== meta.etag) ||
      (remoteMeta.contentLength &&
        meta.contentLength &&
        remoteMeta.contentLength !== meta.contentLength)

    if (!changed) return

    await capCacheBook(remoteUrl, bookId)
    console.log(`[BookCache] ${bookId} mobilde arka planda güncellendi`)
  } catch {
    // Sessiz başarısızlık
  }
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Kitabı önbellekten getir; yoksa indir ve önbelleğe al.
 * Dönen değer EPUB.js'e doğrudan verilebilecek Blob URL.
 * Başarısız olursa `null` döner (orijinal URL kullanılabilir).
 */
export async function resolveBookUrl(
  remoteUrl: string,
  bookId: string
): Promise<string | null> {
  if (!remoteUrl) return null

  // Blob URL zaten varsa doğrudan kullan (nadir durum)
  if (remoteUrl.startsWith('blob:')) return remoteUrl

  try {
    const native = isCapacitorNative()
    const cached = native
      ? await capGetCachedUrl(bookId)
      : await webGetCachedBlobUrl(bookId)

    if (cached) return cached

    // İlk kez indir ve önbelleğe al
    return native
      ? await capCacheBook(remoteUrl, bookId)
      : await webCacheBook(remoteUrl, bookId)
  } catch {
    return null
  }
}

/**
 * Arka planda Content-Hash kontrolü yapar; değişiklik varsa sessizce indirir.
 * Kullanıcı arayüzünü engellemez — fire-and-forget.
 */
export function checkAndUpdateInBackground(remoteUrl: string, bookId: string): void {
  if (!remoteUrl || remoteUrl.startsWith('blob:')) return
  const fn = isCapacitorNative() ? capSilentUpdate : webSilentUpdate
  void fn(remoteUrl, bookId)
}

/**
 * Önbelleği temizle (yönetim / debug amaçlı).
 */
export async function clearBookCache(bookId: string): Promise<void> {
  const native = isCapacitorNative()
  if (native) {
    const fs = getCapFilesystem()
    if (!fs) return
    try { await fs.deleteFile({ path: capPath(bookId), directory: CAP_DIR }) } catch { }
    try { await fs.deleteFile({ path: capMetaPath(bookId), directory: CAP_DIR }) } catch { }
  } else {
    try {
      await idbSet(IDB_STORE_BOOKS, bookKey(bookId), undefined)
      await idbSet(IDB_STORE_META, metaKey(bookId), undefined)
    } catch { }
  }
}
