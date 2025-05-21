import { atom } from "jotai"

export const keymapModalVisibleAtom = atom(false)

export const toggleKeymapModalAtom = atom(
  (get) => get(keymapModalVisibleAtom),
  (get, set) => set(keymapModalVisibleAtom, !get(keymapModalVisibleAtom))
)
