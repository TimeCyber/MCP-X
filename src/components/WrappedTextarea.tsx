import React, { forwardRef } from "react"

const WrappedTextarea = forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>((props, ref) => {
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
      e.stopPropagation()
    }

    if (props.onKeyDown) {
      props.onKeyDown(e)
    }
  }

  return (
    <textarea
      spellCheck={false}
      {...props}
      ref={ref}
      onKeyDown={onKeyDown}
    />
  )
})

WrappedTextarea.displayName = "WrappedTextarea"

export default React.memo(WrappedTextarea)