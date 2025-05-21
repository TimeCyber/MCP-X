import { atom } from "jotai"

export type ToastType = "info" | "success" | "warning" | "error"

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
  duration?: number
  closable?: boolean
}

export const toastsAtom = atom<ToastMessage[]>([])

export const showToastAtom = atom(
  null,
  (get, set, toast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2)
    const newToast = { ...toast, id }
    set(toastsAtom, [...get(toastsAtom), newToast])
    
    if (!toast.closable) {
      setTimeout(() => {
        set(toastsAtom, get(toastsAtom).filter(t => t.id !== id))
      }, toast.duration || 5000)
    }
  }
)

export const hideToastAtom = atom(
  null,
  (get, set, id: string) => {
    set(toastsAtom, get(toastsAtom).filter(toast => toast.id !== id))
  }
) 