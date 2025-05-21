import { useRef } from "react"

const useThrottle = <T extends (...args: any[]) => any>(
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

  const throttled = ((...args: Parameters<T>) => {
    lastArgsRef.current = args

    if (timeoutRef.current)
        return

    timeoutRef.current = setTimeout(() => {
      if (lastArgsRef.current) {
        fn(...lastArgsRef.current)
      }
      timeoutRef.current = null
    }, delay)
  }) as T

  return [throttled, cancel]
}

export default useThrottle 