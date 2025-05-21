import { useEffect, useCallback, useRef } from "react"
import { useAtom, useSetAtom, WritableAtom } from "jotai"
import { closeLayerAtom, pushLayerAtom, emitter, LayerType } from "../atoms/layerState"

export enum Behavior {
  default,
  autoPush,
}

interface Props {
  onClose?: () => boolean | void
  behavior?: Behavior
  type?: LayerType["type"]
}

export function useLayer({ onClose, behavior = Behavior.default, type = "Modal" }: Props) {
  const id = useRef<string | null>(null)
  const pushLayer = useSetAtom(pushLayerAtom)
  const closeLayer = useSetAtom(closeLayerAtom)

  const popHandler = useCallback((layer: LayerType) => {
    if (layer.id === id.current && onClose) {
      const res = onClose()
      if (res === false) {
        pushLayer({ type: layer.type, id: id.current })
      }
    }
  }, [onClose])

  useEffect(() => {
    emitter.on("popped", popHandler)
    return () => {
      emitter.off("popped", popHandler)
    }
  }, [])
  
  useEffect(() => {
    id.current = Math.random().toString(36).substring(2)
    if (behavior === Behavior.autoPush) {
      pushLayer({ type, id: id.current })
    }

    return () => {
      closeLayer(id.current!)
    }
  }, [])
  
  return {
    id: id.current,
    pushLayer: useCallback(() => {
      pushLayer({ type, id: id.current! })
    }, [pushLayer]),
    closeLayer: useCallback(() => {
      closeLayer(id.current!)
    }, [closeLayer]),
  }
}

export function useVisibleLayer(visible: boolean, setVisible: (visible: boolean) => void, type: LayerType["type"] = "Modal"): [boolean, (visible: boolean) => void] {
  const pushLayer = useSetAtom(pushLayerAtom)
  const closeLayer = useSetAtom(closeLayerAtom)
  
  const { id } = useLayer({
    onClose: useCallback(() => {
      setVisible(false)
    }, [setVisible])
  })

  useEffect(() => {
    if (!id) {
      return
    }

    if (visible) {
      pushLayer({ type, id })
    } else {
      closeLayer(id)
    }
  }, [visible])

  return [visible, setVisible]
}

export function useVisibleAtomLayer(atom: WritableAtom<boolean, [visible: boolean], void>, type: LayerType["type"] = "Modal"): [boolean, (visible: boolean) => void] {
  const [visible, setVisible] = useAtom(atom)
  return useVisibleLayer(visible, setVisible, type)
}

export function useSidebarLayer(atom: WritableAtom<boolean, [visible: boolean], void>): [boolean, (visible: boolean) => void] {
  return useVisibleAtomLayer(atom, "Sidebar")
}
