import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAtom } from "jotai"
import { showToastAtom } from "../atoms/toastState"
import Textarea from "./WrappedTextarea"

const CustomInstructions = () => {
  const { t } = useTranslation()
  const [instructions, setInstructions] = useState("")
  const [initialInstructions, setInitialInstructions] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, showToast] = useAtom(showToastAtom)
  const changed = instructions !== initialInstructions
  
  useEffect(() => {
    fetchInstructions()
  }, [])

  const fetchInstructions = async () => {
    try {
      const response = await fetch("/api/config/customrules")
      const data = await response.json()
      if (data.success) {
        setInstructions(data.rules)
        setInitialInstructions(data.rules)
      }
    } catch (error) {
      console.error("Failed to fetch custom rules:", error)
    }
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      const response = await fetch("/api/config/customrules", {
        method: "POST",
        body: instructions
      })
      const data = await response.json()
      if (data.success) {
        showToast({
          message: t("modelConfig.customRulesSaved"),
          type: "success"
        })
        setInitialInstructions(instructions)
      }
    } catch (error) {
      console.error("Failed to save custom rules:", error)
      showToast({
        message: t("modelConfig.customRulesFailed"),
        type: "error"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="custom-instructions">
      <h3>{t("modelConfig.customInstructions")}</h3>
      <Textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        rows={3}
        placeholder={t("modelConfig.customInstructionsPlaceholder")}
      />
      <div className="custom-instructions-description">{t("modelConfig.customInstructionsDescription")}</div>
      <button
        className="save-btn"
        onClick={handleSubmit}
        disabled={isSubmitting || !changed}
      >
        {isSubmitting ? (
          <div className="loading-spinner" />
        ) : (
          t("modelConfig.saveInstructions")
        )}
      </button>
    </div>
  )
}

export default React.memo(CustomInstructions) 