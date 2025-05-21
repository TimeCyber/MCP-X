import { atom } from "jotai"

export interface StreamingCode {
  code: string
  language: string
}

export const codeStreamingAtom = atom<StreamingCode | null>(null)