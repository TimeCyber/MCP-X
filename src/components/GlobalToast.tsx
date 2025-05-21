import React from "react"
import { useAtom } from "jotai"
import { toastsAtom, hideToastAtom } from "../atoms/toastState"
import Toast from "./Toast"
import { createPortal } from "react-dom"

const GlobalToast = () => {
  const [toasts] = useAtom(toastsAtom)
  const [, hideToast] = useAtom(hideToastAtom)

  if (toasts.length === 0)
    return null

  return createPortal(
    <div className="toasts-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          closable={toast.closable}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </div>,
    document.body
  )
}

export default React.memo(GlobalToast) 