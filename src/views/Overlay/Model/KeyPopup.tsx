import { useTranslation } from "react-i18next"
import { InterfaceModelConfig, ModelConfig } from "../../../atoms/configState"
import { defaultInterface, FieldDefinition, InterfaceProvider, PROVIDER_LABELS, PROVIDERS } from "../../../atoms/interfaceState"
import PopupConfirm from "../../../components/PopupConfirm"
import { useEffect, useRef, useState } from "react"
import { showToastAtom } from "../../../atoms/toastState"
import { useAtom } from "jotai"
import React from "react"
import { useModelsProvider } from "./ModelsProvider"
import { formatData } from "../../../helper/config"
import CheckBox from "../../../components/CheckBox"
import Tooltip from "../../../components/Tooltip"

// 记忆用户的选择，避免重复询问
const API_CONFIRM_KEY = "apiConfirmChoices"

// 获取API申请URL
const getApiRequestUrl = (provider: InterfaceProvider): string => {
  switch (provider) {
    case 'openai':
      return 'https://platform.openai.com/api-keys';
    case 'deepseek':
      return 'https://platform.deepseek.com/api_keys';
    case 'qwen':
      return 'https://bailian.console.aliyun.com/?tab=model#/api-key';
    case 'moonshot':
      return 'https://platform.moonshot.cn/console/api-keys';
    case 'anthropic':
      return 'https://console.anthropic.com/settings/keys';
    case 'google_genai':
      return 'https://aistudio.google.com/app/apikey';
    case 'mistralai':
      return 'https://console.mistral.ai/api-keys/';
    // case 'bedrock':
    //   return 'https://console.aws.amazon.com/bedrock';
    case 'ollama':
      return '';
    default:
      return '';
  }
};

const KeyPopup = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (customModelId?: string) => void
}) => {
  const { t } = useTranslation()
  const [provider, setProvider] = useState<InterfaceProvider>(PROVIDERS[0])
  const [fields, setFields] = useState<Record<string, FieldDefinition>>(defaultInterface[PROVIDERS[0]])

  console.log("KeyPopup initialized with provider:", PROVIDERS[0]);
  console.log("defaultInterface[PROVIDERS[0]]:", defaultInterface[PROVIDERS[0]]);
  console.log("Current fields:", fields);
  console.log("Current provider:", provider);

  const [formData, setFormData] = useState<InterfaceModelConfig>({ active: true } as InterfaceModelConfig)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [customModelId, setCustomModelId] = useState<string>("")
  const [verifyError, setVerifyError] = useState<string>("")
  const isVerifying = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, showToast] = useAtom(showToastAtom)
  const [showOptional, setShowOptional] = useState<Record<string, boolean>>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [currentModelUrl, setCurrentModelUrl] = useState("")
  const [currentModelBaseUrl, setCurrentModelBaseUrl] = useState("")
  const [rememberChoice, setRememberChoice] = useState(false)

  const { multiModelConfigList, setMultiModelConfigList,
    saveConfig, prepareModelConfig,
    fetchListOptions, setCurrentIndex
  } = useModelsProvider()

  useEffect(() => {
    // 初始化fields和formData
    console.log("useEffect provider changed to:", provider);
    const initialFields = defaultInterface[provider]
    console.log("initialFields for provider", provider, ":", initialFields);
    
    if (!initialFields) {
      console.error("No fields found for provider:", provider);
      console.log("Available providers in defaultInterface:", Object.keys(defaultInterface));
      return;
    }
    
    setFields(initialFields)
    
    // 根据provider的默认值初始化formData
    const initialFormData: any = { active: true }
    Object.entries(initialFields).forEach(([key, field]) => {
      if (field.default !== undefined && field.default !== "") {
        initialFormData[key] = field.default
      }
    })
    console.log("initialFormData:", initialFormData);
    setFormData(initialFormData as InterfaceModelConfig)
    
    return () => {
      isVerifying.current = false
    }
  }, [provider])

  const handleProviderChange = (newProvider: InterfaceProvider) => {
    setProvider(newProvider)
    setErrors({})
    setVerifyError("")
  }

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    Object.entries(fields).forEach(([key, field]) => {
      if (field.required && !formData[key as keyof InterfaceModelConfig] && key !== "customModelId") {
        newErrors[key] = t("setup.required")
      }
    })

    if (fields["customModelId"]?.required && !customModelId) {
      newErrors["customModelId"] = t("setup.required")
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }
    return true
  }

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      if (data.success) {
        onSuccess(customModelId)
      } else {
        // 检查错误信息是否包含"费用"、"余额"、"quota"等
        const msg = (data.connectingResult || '').toString();
        if (/429|quota|费用|余额|insufficient/i.test(msg)) {
          showToast({
            message: "API Key 没有费用或额度，请充值后再试！",
            type: "error"
          });
          setIsSubmitting(false);
          isVerifying.current = false;
          return; // 阻断后续流程
        }
      }
    } catch (error) {
      console.error("Failed to save config:", error)
      showToast({
        message: t("setup.saveFailed"),
        type: "error"
      })
    }
  }

  const onConfirm = async () => {
    if (!validateForm())
      return

    let __formData = {
      ...formData,
      baseURL: (!fields?.baseURL?.required && !showOptional[provider]) ? "" : formData.baseURL,
    }
    // 获取代理设置
    let proxyType = "none";
    if (typeof window !== "undefined" && window.ipcRenderer && typeof window.ipcRenderer.invoke === "function") {
      try {
        // 注意：此处方法名和参数需与主进程实现一致
        const proxySettings = await window.ipcRenderer.invoke("system:getProxySettings");
        if (proxySettings && typeof proxySettings.type === "string") {
          proxyType = proxySettings.type;
        }
      } catch (e) {
        // 获取失败时，proxyType 保持为 "none"
      }
    }

    // console.log("provider", provider);
    // console.log("proxyType", proxyType);
    if ((proxyType === "custom" || proxyType === "system") && provider === "openai" && !__formData.baseURL) {
      __formData.baseURL = "https://openai.mcp-x.com/v1";
    }

    if ((proxyType === "custom" || proxyType === "system") && provider === "anthropic" && !__formData.baseURL) {
      __formData.baseURL = "https://anthropic.mcp-x.com";
    }

    if ((proxyType === "custom" || proxyType === "system") && provider === "google_genai" && !__formData.baseURL) {
      __formData.baseURL = "https://googleapi.mcp-x.com";
      __formData.model = "gemini-2.0-flash";
    }

    let existingIndex = -1
    if (multiModelConfigList && multiModelConfigList.length > 0) {
      if (__formData.baseURL) {
        if (__formData.apiKey) {
          existingIndex = multiModelConfigList.findIndex(config =>
            config.baseURL === __formData.baseURL &&
            config.apiKey === __formData.apiKey
          )
        } else {
          existingIndex = multiModelConfigList.findIndex(config =>
            config.baseURL === __formData.baseURL
          )
        }
      } else if (__formData.apiKey) {
        existingIndex = multiModelConfigList.findIndex(config =>
          config.apiKey === __formData.apiKey
        )
      }
    }

    if (existingIndex !== -1) {
      setCurrentIndex(existingIndex)
      onSuccess()
      return
    }
    console.log("__formData", __formData);
    const _formData = await prepareModelConfig(__formData, provider)
    console.log("_formData after prepareModelConfig:", _formData);
    console.log("provider:", provider);
    
    // 确保_formData包含所有必需的字段
    const completeFormData = {
      ..._formData,
      modelProvider: provider,
      apiKey: _formData.apiKey || "",
      baseURL: _formData.baseURL || "",
      model: _formData.model || null,
      active: true,
      topP: _formData.topP || 0,
      temperature: _formData.temperature || 0,
    }
    
    let multiModelConfig;
    try {
      const formatResult = formatData(completeFormData);
      console.log("formatData result:", formatResult);
      
      multiModelConfig = {
        ...formatResult,
      name: provider,
      }
      console.log("multiModelConfig:", multiModelConfig);
    } catch (formatError) {
      console.error("formatData error:", formatError);
      throw formatError;
    }

    let _multiModelConfigList = JSON.parse(JSON.stringify(multiModelConfigList))

    try {
      setErrors({})
      setVerifyError("")
      setIsSubmitting(true)
      isVerifying.current = true

      //if custom model id is required, still need to check if the key is valid
      if (!customModelId || fields["customModelId"]?.required) {
        console.log("About to call fetchListOptions with:");
        console.log("multiModelConfig:", multiModelConfig);
        console.log("fields:", fields);
        console.log("typeof fields:", typeof fields);
        console.log("Object.keys(fields):", Object.keys(fields || {}));
        
        const listOptions = await fetchListOptions(multiModelConfig, fields)

        //if custom model id is required, it doesn't need to check if listOptions is empty
        //because fetchListOptions in pre step will throw error if the key is invalid
        if (!listOptions?.length && !fields["customModelId"]?.required) {
          const newErrors: Record<string, string> = {}
          newErrors["apiKey"] = t("models.apiKeyError")
          setErrors(newErrors)
          return
        }
      }

      if (customModelId) {
        // save custom model list to local storage
        const customModelList = localStorage.getItem("customModelList")
        const allCustomModelList = customModelList ? JSON.parse(customModelList) : {}
        localStorage.setItem("customModelList", JSON.stringify({
          ...allCustomModelList,
          [formData.accessKeyId || _formData.apiKey || _formData.baseURL]: [customModelId]
        }))
      }

      setMultiModelConfigList([...(multiModelConfigList ?? []), multiModelConfig])
      setCurrentIndex((multiModelConfigList?.length ?? 0))
      const data = await saveConfig()
      await handleSubmit(data)
    } catch (error) {
      setVerifyError((error as Error).message)
      _multiModelConfigList = JSON.parse(JSON.stringify(multiModelConfigList))
    } finally {
      setIsSubmitting(false)
      isVerifying.current = false
    }
  }

  const handleClose = () => {
    if (isVerifying.current) {
      showToast({
        message: t("models.verifyingAbort"),
        type: "error"
      })
    }
    onClose()
  }

  const handleCopiedError = async (text: string) => {
    await navigator.clipboard.writeText(text)
    showToast({
      message: t("toast.copiedToClipboard"),
      type: "success"
    })
  }

  // 检查是否需要显示确认对话框
  const confirmOpenModelWebsite = (baseUrl: string, url: string) => {
    // 检查是否已经记住了用户的选择
    const savedChoices = localStorage.getItem(API_CONFIRM_KEY)
    const choices = savedChoices ? JSON.parse(savedChoices) : {}

    // 如果用户已经做出选择，则直接按照选择执行
    if (choices[url] === true) {
      handleChange('baseURL', baseUrl)
      openModelWebsite(url)
      return
    } else if (choices[url] === false) {
      // 用户选择了不访问，只填入baseURL
      handleChange('baseURL', baseUrl)
      return
    }

    // 显示确认对话框
    setCurrentModelUrl(url)
    setCurrentModelBaseUrl(baseUrl)
    setShowConfirmDialog(true)
  }

  // 处理用户的确认结果
  const handleConfirmResult = (confirmed: boolean, remember: boolean) => {
    // 填入baseURL
    handleChange('baseURL', currentModelBaseUrl)

    // 如果确认访问，则打开网站
    if (confirmed) {
      openModelWebsite(currentModelUrl)
    }

    // 如果用户选择记住选择，保存到localStorage
    if (remember) {
      const savedChoices = localStorage.getItem(API_CONFIRM_KEY)
      const choices = savedChoices ? JSON.parse(savedChoices) : {}
      choices[currentModelUrl] = confirmed
      localStorage.setItem(API_CONFIRM_KEY, JSON.stringify(choices))
    }

    // 关闭确认对话框
    setShowConfirmDialog(false)
  }

  const openModelWebsite = (url: string) => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send("open-external", url)
    }
  }

  // 处理申请API Key按钮点击
  const handleRequestApiKey = () => {
    const url = getApiRequestUrl(provider);
    if (url) {
      openModelWebsite(url);
    }
  }

  return (
    <PopupConfirm
      noBorder={true}
      zIndex={900}
      footerType="center"
      onConfirm={onConfirm}
      confirmText={(isVerifying.current || isSubmitting) ? (
        <div className="loading-spinner"></div>
      ) : t("tools.save")}
      disabled={isVerifying.current || isSubmitting}
      onCancel={handleClose}
      onClickOutside={handleClose}
    >
      <div className="models-key-popup" style={{ display: 'flex', flexDirection: 'row', width: 800, height: 500 }}>
        {/* 左侧厂商列表 */}
        <div style={{ 
          width: 200, 
          borderRight: '1px solid #eee', 
          paddingRight: 16,
          overflowY: 'auto'
        }}>
            {PROVIDERS.map(p => (
            <div
              key={p}
              style={{
                padding: '12px 8px',
                cursor: 'pointer',
                background: provider === p ? '#f0f0f0' : 'transparent',
                fontWeight: provider === p ? 'bold' : 'normal',
                borderRadius: 6,
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={() => handleProviderChange(p)}
            >
              <span style={{ marginRight: 8 }}>{PROVIDER_LABELS[p]}</span>
            </div>
          ))}
        </div>
        {/* 右侧配置表单 */}
        <div style={{ 
          flex: 1, 
          paddingLeft: 24, 
          paddingRight: 16,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
              {PROVIDER_LABELS[provider]} 配置
            </h3>
          </div>
          
          {Object.entries(fields).map(([key, field]) => {
            return (
          key !== "model" && key !== "customModelId" && (
                <div key={key} className="models-key-form-group" style={{ marginBottom: 16 }}>
              <label className="models-key-field-title">
                <>
                  {(key === "baseURL" && !field.required) ?
                    <div className="models-key-field-optional">
                      <CheckBox
                        checked={showOptional[provider]}
                        onChange={() => setShowOptional(prev => ({ ...prev, [provider]: !prev[provider] }))}
                      ></CheckBox>
                      {`${field.label}${t("models.optional")}`}
                    </div>
                    : field.label}
                  {field.required && <span className="required">*</span>}
                </>
                <div className="models-key-field-description">{field.description}</div>
              </label>
              {(showOptional[provider] || key !== "baseURL" || field.required) && (
                    <div>
                  <div className="api-key-input-wrapper">
                    <input
                          type={field.inputType === "password" ? "password" : "text"}
                      value={formData[key as keyof ModelConfig] as string || ""}
                      onChange={e => handleChange(key, e.target.value)}
                      placeholder={field.placeholder?.toString()}
                      className={errors[key] ? "error" : ""}
                          style={{ width: '100%' }}
                    />
                    {/* 在API Key输入框旁边添加申请链接按钮 */}
                    {key === 'apiKey' && (
                      <button
                        type="button"
                        className="api-request-btn"
                        onClick={handleRequestApiKey}
                        title={t('models.requestApiKey')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}
              {errors[key] && <div className="error-message">{errors[key]}</div>}
            </div>
          )
            )
          })}
          
          <div className="models-key-form-group" style={{ marginBottom: 16 }}>
          <label className="models-key-field-title">
            <>
              {`Custom Model ID`}
              {fields["customModelId"]?.required ?
                <span className="required">*</span>
                : t("models.optional")}
            </>
          </label>
          <input
            type={"text"}
            value={customModelId as string || ""}
            onChange={e => setCustomModelId(e.target.value)}
            placeholder={"YOUR_MODEL_ID"}
            className={errors["customModelId"] ? "error" : ""}
              style={{ width: '100%' }}
          />
          {errors["customModelId"] && <div className="error-message">{errors["customModelId"]}</div>}
        </div>
          
        {verifyError && (
          <Tooltip content={t("models.copyContent")}>
            <div onClick={() => handleCopiedError(verifyError)} className="error-message">
              {verifyError}
              <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 22 22" fill="transparent">
                <path d="M13 20H2V6H10.2498L13 8.80032V20Z" fill="transparent" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinejoin="round" />
                <path d="M13 9H10V6L13 9Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 3.5V2H17.2498L20 4.80032V16H16" fill="transparent" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinejoin="round" />
                <path d="M20 5H17V2L20 5Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Tooltip>
        )}
      </div>
      </div>
      {/* API申请确认对话框 */}
      {showConfirmDialog && (
        <div className="api-confirm-dialog">
          <div className="api-confirm-backdrop" onClick={() => handleConfirmResult(false, false)}></div>
          <div className="api-confirm-content">
            <div className="api-confirm-title">{t('models.apiConfirmTitle')}</div>
            <div className="api-confirm-message">{t('models.apiConfirmMessage')}</div>

            <div className="api-confirm-remember">
              <CheckBox
                id="remember-choice"
                checked={rememberChoice}
                onChange={e => setRememberChoice(e.target.checked)}
              />
              <label htmlFor="remember-choice">{t('models.rememberChoice')}</label>
            </div>

            <div className="api-confirm-buttons">
              <button
                className="api-confirm-cancel"
                onClick={() => handleConfirmResult(false, rememberChoice)}
              >
                {t('common.cancel')}
              </button>
              <button
                className="api-confirm-ok"
                onClick={() => handleConfirmResult(true, rememberChoice)}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PopupConfirm>
  )
}

export default React.memo(KeyPopup)