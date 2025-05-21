import { useRef } from "react"

const useDebounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): [T, () => void] => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastArgsRef = useRef<Parameters<T> | null>(null)

  const cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const debounced = ((...args: Parameters<T>) => {
    lastArgsRef.current = args
    cancel()

    timeoutRef.current = setTimeout(() => {
      if (lastArgsRef.current) {
        fn(...lastArgsRef.current)
      }
      timeoutRef.current = null
    }, delay)
  }) as T

  return [debounced, cancel]
}

export default useDebounce 