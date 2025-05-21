import React from "react"
import Mermaid from "./preview/mermaid"
import Html from "./preview/html"

interface CodePreviewProps {
  language: string
  code: string
}

const CodePreview = ({ language, code }: CodePreviewProps) => {
  if (language === "mermaid") {
    return <Mermaid chart={code} />
  }

  if (language === "html" || language === "svg" || language === "xml") {
    return <Html html={code} />
  }

  return (
    <></>
  )
}

export default React.memo(CodePreview)