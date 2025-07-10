import { atom } from "jotai"

export type NavSection = "chat" | "agent" | "tools" | "model" | "system"

export const navSectionAtom = atom<NavSection>("chat")

// 调试版本的导航状态原子
export const debugNavSectionAtom = atom(
  (get) => get(navSectionAtom),
  (get, set, newValue: NavSection) => {
    const currentValue = get(navSectionAtom)
    console.log('=== NAV STATE CHANGE ===')
    console.log('Previous nav section:', currentValue)
    console.log('New nav section:', newValue)
    console.log('========================')
    set(navSectionAtom, newValue)
  }
) 