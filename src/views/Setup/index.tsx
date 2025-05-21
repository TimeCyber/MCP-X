import React, { useState } from "react"
import { useSetAtom } from "jotai"
import { InterfaceProvider, defaultInterface } from "../../atoms/interfaceState"
import { useTranslation } from "react-i18next"
import { useNavigate, useLocation } from "react-router-dom"
import ModelConfigForm from "./ModelConfigForm"
import ProxySettingsForm from "../../components/ProxySettingsForm"
import { showToastAtom } from "../../atoms/toastState"
import "../../styles/proxy-settings.css"

const Setup = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isInitialSetup = location.pathname !== '/setup'
  const [localProvider, setLocalProvider] = useState<InterfaceProvider>("openai")
  const [activeTab, setActiveTab] = useState<'model' | 'proxy'>('model')
  const showToast = useSetAtom(showToastAtom)

  const handleModelSubmit = async (data: any) => {
    try {
      if (data.success) {
        showToast({
          message: t("setup.saveSuccess"),
          type: "success"
        })
      }
    } catch (error) {
      console.error("Failed to save config:", error)
      showToast({
        message: t("setup.saveFailed"),
        type: "error"
      })
    }
  }

  const handleProxySubmit = async (proxySettings: any) => {
    try {
      await window.ipcRenderer.setProxySettings(proxySettings)
      showToast({
        message: t("proxy.saveSuccess"),
        type: "success"
      })
    } catch (error) {
      console.error("Failed to save proxy settings:", error)
      showToast({
        message: t("proxy.saveFailed"),
        type: "error"
      })
    }
  }

  return (
    <div className="setup-page">
      <div className="setup-container">
        {!isInitialSetup && (
          <button
            className="back-btn"
            onClick={() => navigate(-1)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            {t('setup.back')}
          </button>
        ) || (
          <>
            <h1>{t("setup.title")}</h1>
            <p className="subtitle">{t("setup.subtitle")}</p>
          </>
        )}

        <div className="setup-tabs">
          <button 
            className={`tab-btn ${activeTab === 'model' ? 'active' : ''}`}
            onClick={() => setActiveTab('model')}
          >
            {t("setup.modelTab")}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'proxy' ? 'active' : ''}`}
            onClick={() => setActiveTab('proxy')}
          >
            {t("setup.proxyTab")}
          </button>
        </div>

        {activeTab === 'model' && (
          <ModelConfigForm
            provider={localProvider}
            fields={defaultInterface[localProvider]}
            onSubmit={handleModelSubmit}
            onProviderChange={setLocalProvider}
            submitLabel="setup.submit"
          />
        )}

        {activeTab === 'proxy' && (
          <ProxySettingsForm onSave={handleProxySubmit} />
        )}
      </div>
    </div>
  )
}

export default React.memo(Setup)