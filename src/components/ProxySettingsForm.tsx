import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface ProxySettings {
  type: string;
  host: string;
  port: string;
  username: string;
  password: string;
}

interface ProxySettingsFormProps {
  onSave: (settings: ProxySettings) => void;
}

const ProxySettingsForm: React.FC<ProxySettingsFormProps> = ({ onSave }) => {
  const { t } = useTranslation();
  const [proxySettings, setProxySettings] = useState<ProxySettings>({
    type: "none",
    host: "",
    port: "",
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProxySettings = async () => {
      try {
        const settings = await window.ipcRenderer.getProxySettings();
        if (settings) {
          setProxySettings(settings);
        }
      } catch (error) {
        console.error("Failed to load proxy settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProxySettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProxySettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(proxySettings);
    } catch (error) {
      console.error("Failed to save proxy settings:", error);
    }
  };

  if (loading) {
    return <div>{t("common.loading")}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="proxy-settings-form">
      <div className="form-group">
        <label>{t("proxy.type")}</label>
        <select 
          name="type" 
          value={proxySettings.type} 
          onChange={handleChange}
          className="form-select"
        >
          <option value="none">{t("proxy.none")}</option>
          <option value="system">{t("proxy.system")}</option>
          <option value="custom">{t("proxy.custom")}</option>
        </select>
      </div>

      {proxySettings.type === "custom" && (
        <>
          <div className="form-group">
            <label>{t("proxy.host")}</label>
            <input
              type="text"
              name="host"
              value={proxySettings.host}
              onChange={handleChange}
              className="form-input"
              placeholder={t("proxy.hostPlaceholder")}
              required
            />
          </div>

          <div className="form-group">
            <label>{t("proxy.port")}</label>
            <input
              type="text"
              name="port"
              value={proxySettings.port}
              onChange={handleChange}
              className="form-input"
              placeholder={t("proxy.portPlaceholder")}
              required
            />
          </div>

          <div className="form-group">
            <label>{t("proxy.username")} ({t("common.optional")})</label>
            <input
              type="text"
              name="username"
              value={proxySettings.username}
              onChange={handleChange}
              className="form-input"
              placeholder={t("proxy.usernamePlaceholder")}
            />
          </div>

          <div className="form-group">
            <label>{t("proxy.password")} ({t("common.optional")})</label>
            <input
              type="password"
              name="password"
              value={proxySettings.password}
              onChange={handleChange}
              className="form-input"
              placeholder={t("proxy.passwordPlaceholder")}
            />
          </div>
        </>
      )}

      <div className="form-actions">
        <button type="submit" className="primary-button">
          {t("proxy.save")}
        </button>
      </div>
    </form>
  );
};

export default ProxySettingsForm; 