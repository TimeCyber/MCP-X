import { useAtom } from "jotai"
import { useTranslation } from "react-i18next"
import Select from "../../components/Select"
import { closeOverlayAtom } from "../../atoms/layerState"
import React, { useState, useEffect } from "react"

import ThemeSwitch from "../../components/ThemeSwitch"
import Switch from "../../components/Switch"
import { getAutoDownload, setAutoDownload as _setAutoDownload } from "../../updater"
import "../../styles/setup-styles.css" // 引入样式

// 定义代理设置接口
interface ProxySettings {
  type: string;
  proxyTitle: string;
  host: string;
  port: string;
  username: string;
  password: string;
}

const System = () => {
  const { t, i18n } = useTranslation()
  const [, closeOverlay] = useAtom(closeOverlayAtom)
  const [language, setLanguage] = useState(i18n.language)
  const [autoDownload, setAutoDownload] = useState(false)
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [minimalToTray, setMinimalToTray] = useState(false)
  
  // 代理设置相关状态
  const [proxySettings, setProxySettings] = useState<ProxySettings>({
    type: "none",
    host: "",
    port: "",
    proxyTitle: "",
    username: "",
    password: "",
  })
  const [proxyLoading, setProxyLoading] = useState(true)

  useEffect(() => {
    window.ipcRenderer.getAutoLaunch().then(setAutoLaunch)
    window.ipcRenderer.getMinimalToTray().then(setMinimalToTray)
    
    // 加载代理设置
    const loadProxySettings = async () => {
      try {
        const settings = await window.ipcRenderer.getProxySettings()
        if (settings) {
          setProxySettings(settings)
        }
      } catch (error) {
        console.error("Failed to load proxy settings:", error)
      } finally {
        setProxyLoading(false)
      }
    }
    
    loadProxySettings()
  }, [])

  const handleAutoLaunchChange = (value: boolean) => {
    setAutoLaunch(value)
    window.ipcRenderer.setAutoLaunch(value)
  }

  const languageOptions = [
    { label: "繁體中文", value: "zh-TW" },
    { label: "简体中文", value: "zh-CN" },
    { label: "English", value: "en" },
    { label: "Español", value: "es" },
  ]
  
  // 代理类型选项
  const proxyTypeOptions = [
    { label: t("proxy.none"), value: "none" },
    { label: t("proxy.system"), value: "system" },
    { label: t("proxy.custom"), value: "custom" },
  ]

  useEffect(() => {
    setAutoDownload(getAutoDownload())
  }, [])

  const onClose = () => {
    closeOverlay("System")
  }

  const handleLanguageChange = async (value: string) => {
    setLanguage(value)
    await i18n.changeLanguage(value)
    setDefaultInstructions()
  }
  
  // 处理代理类型变更
  const handleProxyTypeChange = async (value: string) => {
    const updatedSettings = {
      ...proxySettings,
      type: value
    };
    setProxySettings(updatedSettings);
    try {
      await window.ipcRenderer.setProxySettings(updatedSettings);
      // 可以添加一个小的提示，或者不显示提示让体验更流畅
    } catch (error) {
      console.error("Failed to save proxy settings:", error);
      alert(t("proxy.saveFailed"));
    }
  }
  
  // 处理代理设置字段变更
  const handleProxyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedSettings = {
      ...proxySettings,
      [name]: value
    };
    setProxySettings(updatedSettings);
    
    // 使用防抖保存
    debouncedSave(updatedSettings);
    try {
      // 可以考虑添加防抖处理，避免频繁保存
      await window.ipcRenderer.setProxySettings(updatedSettings);
    } catch (error) {
      console.error("Failed to save proxy settings:", error);
    }
  }
  
  // 添加防抖函数
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

// 使用防抖处理保存
const debouncedSave = debounce(async (settings: ProxySettings) => {
  try {
    await window.ipcRenderer.setProxySettings(settings);
  } catch (error) {
    console.error("Failed to save proxy settings:", error);
  }
}, 500);
  
  // 保存代理设置
  const saveProxySettings = async () => {
    try {
      await window.ipcRenderer.setProxySettings(proxySettings)
      alert(t("proxy.saveSuccess"))
    } catch (error) {
      console.error("Failed to save proxy settings:", error)
      alert(t("proxy.saveFailed"))
    }
  }

  const setDefaultInstructions = async () => {
    try {
      const response = await fetch("/api/config/customrules")
      const data = await response.json()
      if (data.success && data.rules === "") {
        await fetch("/api/config/customrules", {
          method: "POST",
          body: t("system.defaultInstructions")
        })
      }
    } catch (error) {
      console.error("Failed to fetch custom rules:", error)
    }
  }

  const handleMinimalToTrayChange = (value: boolean) => {
    setMinimalToTray(value)
    window.ipcRenderer.setMinimalToTray(value)
  }

  return (
    <div className="system-page overlay-page">
      {/* <button
        className="close-btn"
        onClick={onClose}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button> */}
      <div className="system-container">
        <div className="system-header">
          <div>
            <h1>{t("system.title")}</h1>
          </div>
        </div>
        <div className="system-content">

          {/* language */}
          <div className="system-list-section">
            <div className="system-list-content">
              <span className="system-list-name">{t("system.language")}:</span>
            </div>
            <div className="system-list-switch-container">
              <Select
                options={languageOptions}
                value={language}
                onSelect={(value) => handleLanguageChange(value)}
                align="end"
              />
            </div>
          </div>

          {/* theme */}
          <div className="system-list-section">
            <div className="system-list-content">
              <span className="system-list-name">{t("system.theme")}:</span>
            </div>
            <div className="system-list-switch-container">
              <ThemeSwitch />
            </div>
          </div>

          {/* auto download */}
          <div className="system-list-section">
            <div className="system-list-content">
              <span className="system-list-name">{t("system.autoDownload")}:</span>
            </div>
            <div className="system-list-switch-container">
              <Switch
                checked={autoDownload}
                onChange={(e) => {
                  setAutoDownload(e.target.checked)
                  _setAutoDownload(e.target.checked)
                }}
              />
            </div>
          </div>

          {/* auto launch */}
          <div className="system-list-section">
            <div className="system-list-content">
              <span className="system-list-name">{t("system.autoLaunch")}:</span>
            </div>
            <div className="system-list-switch-container">
              <Switch
                checked={autoLaunch}
                onChange={e => handleAutoLaunchChange(e.target.checked)}
              />
            </div>
          </div>

          {/* minimal to tray */}
          <div className="system-list-section">
            <div className="system-list-content">
              <span className="system-list-name">{t("system.minimalToTray")}:</span>
            </div>
            <div className="system-list-switch-container">
              <Switch
                checked={minimalToTray}
                onChange={e => handleMinimalToTrayChange(e.target.checked)}
              />
            </div>
          </div>
          
          {/* 代理设置标题 */}
          {/* <div className="system-section-title">
            <h2>{t("proxy.settings")}</h2>
          </div> */}
          
          {/* 代理类型 */}
          <div className="system-list-section">
            <div className="system-list-content">
              <span className="system-list-name">{t("proxy.type")}:</span>
            </div>
            <div className="system-list-switch-container">
            <Select
                options={proxyTypeOptions}
                value={proxySettings.type}
                onSelect={handleProxyTypeChange}
                align="end"
              />
            </div>
          </div>
          
          {/* 自定义代理设置 */}
          {proxySettings.type === "custom" && (
            <div className="custom-proxy-fields">
              {/* 代理主机 */}
              <div className="system-list-section">
                <div className="system-list-content">
                  <span className="system-list-name">{t("proxy.host")}:</span>
                </div>
                <div className="system-list-input-container">
                  <input
                    type="text"
                    name="host"
                    value={proxySettings.host}
                    onChange={handleProxyChange}
                    placeholder={t("proxy.hostPlaceholder")}
                    className="system-input"
                  />
                </div>
              </div>
              
              {/* 代理端口 */}
              <div className="system-list-section">
                <div className="system-list-content">
                  <span className="system-list-name">{t("proxy.port")}:</span>
                </div>
                <div className="system-list-input-container">
                  <input
                    type="text"
                    name="port"
                    value={proxySettings.port}
                    onChange={handleProxyChange}
                    placeholder={t("proxy.portPlaceholder")}
                    className="system-input"
                  />
                </div>
              </div>
              
              {/* 用户名 */}
              <div className="system-list-section">
                <div className="system-list-content">
                  <span className="system-list-name">{t("proxy.username")} ({t("common.optional")}):</span>
                </div>
                <div className="system-list-input-container">
                  <input
                    type="text"
                    name="username"
                    value={proxySettings.username}
                    onChange={handleProxyChange}
                    placeholder={t("proxy.usernamePlaceholder")}
                    className="system-input"
                  />
                </div>
              </div>
              
              {/* 密码 */}
              <div className="system-list-section">
                <div className="system-list-content">
                  <span className="system-list-name">{t("proxy.password")} ({t("common.optional")}):</span>
                </div>
                <div className="system-list-input-container">
                  <input
                    type="password"
                    name="password"
                    value={proxySettings.password}
                    onChange={handleProxyChange}
                    placeholder={t("proxy.passwordPlaceholder")}
                    className="system-input"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* 保存代理设置按钮 */}
          {/* <div className="system-list-section">
            <div className="system-list-content">
              <button 
                onClick={saveProxySettings}
                className="save-proxy-button"
              >
                {t("proxy.save")}
              </button>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  )
}

export default React.memo(System)