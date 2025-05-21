import { atom } from "jotai"

export const lastMessageAtom = atom<string>("")
export const currentChatIdAtom = atom<string>("")
export const isChatStreamingAtom = atom<boolean>(false)