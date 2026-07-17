import { create } from 'zustand'
import exodus14 from '../data/chapters/exodus-14.json'
import acts13 from '../data/chapters/acts-13.json'

export const CHAPTERS = {
  'Exodus-14': exodus14,
  'Acts-13': acts13,
}

export const useReadingStore = create((set) => ({
  activeChapterKey: 'Exodus-14',
  activeEntityId: null,
  setActiveChapter: (key) => set({ activeChapterKey: key, activeEntityId: null }),
  setActiveEntity: (entityId) => set({ activeEntityId: entityId }),
}))
