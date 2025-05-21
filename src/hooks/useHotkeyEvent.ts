import { useEffect } from "react"
import { emitter, HotkeyEvent } from "../atoms/hotkeyState"

export default function useHotkeyEvent(event: HotkeyEvent, callback: () => void, deps: any[] = []) {
  useEffect(() => {
    emitter.on(event, callback)
    return () => {
      emitter.off(event, callback)
    }
  }, [event, callback, ...deps])
}