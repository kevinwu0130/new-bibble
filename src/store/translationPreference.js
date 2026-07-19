const STORAGE_KEY = 'new-bibble:translation-mode'

// 'cuv'：只顯示和合本；'parallel'：和合本 + WEB 英文對照
export function loadTranslationMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'parallel' ? 'parallel' : 'cuv'
  } catch {
    return 'cuv'
  }
}

export function saveTranslationMode(mode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // 忽略（隱私瀏覽模式等 storage 不可用的情況）
  }
}
