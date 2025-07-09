import { atom } from "jotai"

export type NavSection = "chat" | "agent" | "tools" | "model" | "system"

export const navSectionAtom = atom<NavSection>("chat") 