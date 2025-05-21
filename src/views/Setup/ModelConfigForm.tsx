import React, { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { FieldDefinition, InterfaceProvider, PROVIDER_LABELS, PROVIDERS } from "../../atoms/interfaceState"
import { InterfaceModelConfig, ModelConfig, prepareModelConfig, saveFirstConfigAtom, verifyModelWithConfig, writeEmptyConfigAtom } from "../../atoms/configState"
import { useSetAtom } from "jotai"
import { loadConfigAtom } from "../../atoms/configState"
import useDebounce from "../../hooks/useDebounce"
import { showToastAtom } from "../../atoms/toastState"
import Input from "../../components/WrappedInput"
import Tooltip from "../../components/Tooltip"

interface ModelConfigFormProps {
  provider: InterfaceProvider
  fields: Record<string, FieldDefinition>
  onProviderChange?: (provider: InterfaceProvider) => void
  onSubmit: (data: any) => void
  submitLabel?: string
}

const ModelConfigForm: React.FC<ModelConfigFormProps> = ({
  provider,
  fields,
  onProviderChange,
  onSubmit,
  submitLabel = "setup.submit",
}) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<InterfaceModelConfig>({} as InterfaceModelConfig)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [verifyError, setVerifyError] = useState<string>("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerifyingNoTool, setIsVerifyingNoTool] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [listOptions, setListOptions] = useState<Record<string, string[]>>({} as Record<string, string[]>)
  const initProvider = useRef(provider)
  const loadConfig = useSetAtom(loadConfigAtom)
  const saveConfig = useSetAtom(saveFirstConfigAtom)
  const writeEmptyConfig = useSetAtom(writeEmptyConfigAtom)
  const showToast = useSetAtom(showToastAtom)

  const [fetchListOptions, cancelFetch] = useDebounce(async (key: string, field: FieldDefinition, deps: Record<string, string>) => {
    try {
      setVerifyError("")
      const options = await field.listCallback!(deps)
      setListOptions(prev => ({
        ...prev,
        [key]: options
      }))

      if (options.length > 0 && !options.includes(formData[key as keyof ModelConfig] as string)) {
        handleChange(key, options[0])
      }
    } catch (error) {
      setVerifyError((error as Error).message)
    }
  }, 100)

  useEffect(() => {
    if (initProvider.current !== provider) {
      setListOptions({})
      setFormData(getFieldDefaultValue())
    }
  }, [provider])

  useEffect(() => {
    Object.entries(fields).forEach(([key, field]) => {
      if (field.type === "list" && field.listCallback && field.listDependencies) {
        const deps = field.listDependencies.reduce((acc, dep) => ({
          ...acc,
          [dep]: formData[dep as keyof InterfaceModelConfig] || ""
        }), {})

        const allDepsHaveValue = field.listDependencies.every(dep => !!formData[dep as keyof ModelConfig])

        if (allDepsHaveValue) {
          fetchListOptions(key, field, deps)
        }
      }
    })

    return () => {
      cancelFetch()
    }
  }, [fields, formData])

  const getFieldDefaultValue = () => {
    return Object.keys(fields).reduce((acc, key) => {
      return {
        ...acc,
        [key]: fields[key].default
      }
    }, {} as InterfaceModelConfig)
  }

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as InterfaceProvider
    onProviderChange?.(newProvider)
    setIsVerified(false)
  }

  const verifyModel = async () => {
    try {
      setIsVerifying(true)
      if (provider === "openai_compatible"||provider === "openai") {
        formData.modelProvider = "openai"
      }
      
      if (provider === "google_genai") {
        formData.modelProvider = "google_genai"
      }
      const data = await verifyModelWithConfig(formData)
      if (data.success) {
        setIsVerified(true)
        if(data.connectingSuccess && data.supportTools) {
          setIsVerifyingNoTool(false)
          showToast({
            message: t("setup.verifySuccess"),
            type: "success",
            duration: 5000
          })
        }else if(data.connectingSuccess || data.supportTools){
          setIsVerifyingNoTool(true)
          showToast({
            message: t("setup.verifySuccessNoTool"),
            type: "success",
            duration: 5000
          })
        }
      } else {
        // 检查是否是“无费用”错误
        if (data.error && /429|quota|费用|余额|insufficient/i.test(data.error)) {
          showToast({
            message: "API Key 没有费用或额度，请充值后再试！",
            type: "error"
          })
          setIsVerified(false)
          return // 阻断后续流程
        }
        setIsVerified(false)
        showToast({
          message: t("setup.verifyFailed"),
          type: "error",
          duration: 5000
        })
      }
    } catch (error) {
      console.error("Failed to verify model:", error)
      setIsVerified(false)
      showToast({
        message: t("setup.verifyError"),
        type: "error"
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm())
      return

    try {
      setIsSubmitting(true)
      const _formData = await prepareModelConfig(formData, provider)
      await onSubmit(saveConfig({ data: _formData, provider }))
      loadConfig()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
    setErrors(prev => ({
      ...prev,
      [key]: ""
    }))
    if(fields[key]?.required) {
      setIsVerified(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    Object.entries(fields).forEach(([key, field]) => {
      if (field.required && !formData[key as keyof ModelConfig]) {
        newErrors[key] = t("setup.required")
      }
    })

    if (provider === 'openai_compatible' && !formData.baseURL) {
      newErrors.baseURL = t("setup.required")
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }
    return true
  }

  const handleSkip = () => {
    writeEmptyConfig()
  }

  const handleCopiedError = async (text: string) => {
    await navigator.clipboard.writeText(text)
    showToast({
      message: t("toast.copiedToClipboard"),
      type: "success"
    })
  }
  
  const handleQuickUrlSelect = (url: string) => {
    handleChange('baseURL', url)
  }

  const openModelWebsite = (url: string) => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send("open-external", url)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>{t("setup.provider")}</label>
        <select
          value={provider}
          onChange={handleProviderChange}
          className="provider-select"
        >
          {PROVIDERS.map(p => (
            <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
          ))}
        </select>
        {provider === 'openai_compatible' && (
          <div className="quick-url-buttons">
            <button 
              type="button" 
              className="quick-url-btn" 
              onClick={() => {
                handleChange('baseURL', 'https://api.deepseek.com/v1')
              }}
            >
              深度求索 Deepseek
            </button>
            <button 
              type="button" 
              className="quick-url-btn" 
              onClick={() => {
                handleChange('baseURL', 'https://dashscope.aliyuncs.com/compatible-mode/v1')
              }}
            >
              通义千问 Qwen
            </button>
            <button 
              type="button" 
              className="quick-url-btn" 
              onClick={() => {
                handleChange('baseURL', 'https://api.moonshot.cn/v1')
              }}
            >
              月之暗面 Kimi
            </button>
          </div>
        )}
      </div>

      {Object.entries(fields).map(([key, field]) => (
        <div key={key} className="form-group">
          <label>
            {field.label}
            {field.required && <span className="required">*</span>}
          </label>
          <div className="field-description">{t(field.description)}</div>
          {field.type === "list" ? (
            <select
              value={formData[key as keyof ModelConfig] as string || ""}
              onChange={e => handleChange(key, e.target.value)}
              className={errors[key] ? "error" : ""}
            >
              <option value="">{field.placeholder}</option>
              {listOptions[key]?.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <div className={key === 'baseURL' && provider === 'openai_compatible' ? 'base-url-input-container' : ''}>
              <Input
                type={"text"}
                value={formData[key as keyof ModelConfig] as string || ""}
                onChange={e => handleChange(key, e.target.value)}
                placeholder={field.placeholder?.toString()}
                className={errors[key] ? "error" : ""}
              />
              {key === 'apiKey' && (
                <div className="api-key-links">
                  {provider === 'openai' && (
                    <button
                      type="button"
                      className="get-key-btn"
                      onClick={() => openModelWebsite('https://platform.openai.com/api-keys')}
                    >
                      获取OpenAI密钥
                    </button>
                  )}
                  {provider === 'anthropic' && (
                    <button
                      type="button"
                      className="get-key-btn"
                      onClick={() => openModelWebsite('https://console.anthropic.com/settings/keys')}
                    >
                      获取Anthropic密钥
                    </button>
                  )}
                  {provider === 'google_genai' && (
                    <button
                      type="button"
                      className="get-key-btn"
                      onClick={() => openModelWebsite('https://aistudio.google.com/app/apikey')}
                    >
                      获取Google AI密钥
                    </button>
                  )}
                  {provider === 'mistralai' && (
                    <button
                      type="button"
                      className="get-key-btn"
                      onClick={() => openModelWebsite('https://console.mistral.ai/api-keys')}
                    >
                      获取Mistral AI密钥
                    </button>
                  )}
                  {/* {provider === 'bedrock' && (
                    <button
                      type="button"
                      className="get-key-btn"
                      onClick={() => openModelWebsite('https://console.aws.amazon.com/iamv2/home#/users/create')}
                    >
                      获取AWS密钥
                    </button>
                  )} */}
                  {provider === 'openai_compatible' && formData.baseURL?.includes('api.deepseek.com') && (
                    <button
                      type="button"
                      className="get-key-btn"
                      onClick={() => openModelWebsite('https://platform.deepseek.com/api_keys')}
                    >
                      获取深度求索密钥
                    </button>
                  )}
                  {provider === 'openai_compatible' && formData.baseURL?.includes('dashscope.aliyuncs.com') && (
                    <button
                      type="button"
                      className="get-key-btn"
                      onClick={() => openModelWebsite('https://bailian.console.aliyun.com/?tab=model#/api-key')}
                    >
                      获取通义千问密钥
                    </button>
                  )}
                  {provider === 'openai_compatible' && formData.baseURL?.includes('api.moonshot.cn') && (
                    <button
                      type="button"
                      className="get-key-btn"
                      onClick={() => openModelWebsite('https://platform.moonshot.cn/console/api-keys')}
                    >
                      获取月之暗面密钥
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {key==="model" && isVerifyingNoTool && (
              <div className="field-model-description">
                {t("setup.verifySuccessNoTool")}
              </div>
          )}
          {errors[key] && <div className="error-message">{errors[key]}</div>}
        </div>
      ))}

        {verifyError && (
          <Tooltip content={t("models.copyContent")}>
            <div onClick={() => handleCopiedError(verifyError)} className="error-message">
              {verifyError}
              <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 22 22" fill="transparent">
                <path d="M13 20H2V6H10.2498L13 8.80032V20Z" fill="transparent" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinejoin="round"/>
                <path d="M13 9H10V6L13 9Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 3.5V2H17.2498L20 4.80032V16H16" fill="transparent" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinejoin="round"/>
                <path d="M20 5H17V2L20 5Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Tooltip>
        )}

      <div className="form-actions">
        <button
          type="button"
          className="verify-btn"
          onClick={verifyModel}
          disabled={isVerifying || isSubmitting}
        >
          {isVerifying ? (
            <div className="loading-spinner"></div>
          ) : t("setup.verify")}
        </button>
        <button
          type="submit"
          className="submit-btn"
          disabled={isVerifying || isSubmitting || !isVerified}
        >
          {isSubmitting ? (
            <div className="loading-spinner"></div>
          ) : t(submitLabel)}
        </button>
      </div>

      <div className="form-actions">
        <div className="skip-btn" onClick={handleSkip}>Skip</div>
      </div>

    </form>
  )
}

export default React.memo(ModelConfigForm)