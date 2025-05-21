import React, { forwardRef } from "react"

const WrappedInput = forwardRef<HTMLInputElement, React.ComponentProps<"input">>((props, ref) => {
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
      e.stopPropagation()
    }

    if (props.onKeyDown) {
      props.onKeyDown(e)
    }
  }

  return (
    <input
      spellCheck={false}
      {...props}
      ref={ref}
      onKeyDown={onKeyDown}
    />
  )
})

WrappedInput.displayName = "WrappedInput"

export default React.memo(WrappedInput)