import React, { useEffect, useRef } from "react"

interface HtmlPreviewProps {
  html: string
}

const HtmlPreview: React.FC<HtmlPreviewProps> = ({ html }) => {
  return (
    <iframe
      className="html-preview"
      sandbox="allow-scripts"
      title="HTML Preview"
      srcDoc={html}
    />
  )
}

export default React.memo(HtmlPreview)