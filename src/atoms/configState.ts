import { getVerifyStatus } from './../views/Overlay/Model/ModelVerify'
import { atom } from "jotai"
import { EMPTY_PROVIDER, InterfaceProvider, ModelProvider } from "./interfaceState"
import { getModelPrefix } from "../util"
import { transformModelProvider } from "../helper/config"
import { ignoreFieldsForModel } from '../constants'

// 代理感知的fetch函数，在Electron环境中会自动使用系统配置的代理
async function fetchWithProxy(url: string, options?: RequestInit) {
  // 在Electron中，fetch已自动应用了session设置的代理配置
  return fetch(url, options);
}

export type ProviderRequired = {
  apiKey: string
  baseURL: string
  model: string | null
}

export type ModelParameter = {
  topP: number
  temperature: number
}

export type BedrockCredentials = {
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
}

export type ModelConfig = ProviderRequired & ModelParameter & {
  modelProvider: ModelProvider
  configuration: Partial<ProviderRequired> & ModelParameter
  active: boolean
}

export type InterfaceModelConfig = Omit<ModelConfig, "modelProvider"> & Partial<ModelParameter> & Partial<BedrockCredentials> & {
  modelProvider: InterfaceProvider
}

export type ModelConfigMap = Record<string, ModelConfig>
export type InterfaceModelConfigMap = Record<string, InterfaceModelConfig>

export type RawModelConfig = {
  activeProvider: string
  configs: ModelConfigMap
}

export type MultiModelConfig = ProviderRequired & ModelParameter & Partial<BedrockCredentials> & {
  name: InterfaceProvider
  active: boolean
  checked: boolean
  models: string[]
}

export const configAtom = atom<RawModelConfig>({
  activeProvider: "",
  configs: {}
})

export const updateConfigWithProviderAtom = atom(
  null,
  (get, set, params: {
    provider: string
    data: ModelConfig
  }) => {
    const { provider, data } = params
    const config = get(configAtom)
    config.configs[provider] = data
    set(configAtom, { ...config })
  }
)

export const activeConfigAtom = atom<ModelConfig | null>(
  (get) => {
    const config = get(configAtom)
    return !config ? null : config.configs[config.activeProvider] || null
  }
)

export const activeConfigIdAtom = atom<string>(
  (get) => {
    const config = get(configAtom)
    return !config ? "" : config.activeProvider
  }
)

export const enabledConfigsAtom = atom<ModelConfigMap>(
  (get) => {
    const localListOptions = localStorage.getItem("modelVerify")
    const allVerifiedList = localListOptions ? JSON.parse(localListOptions) : {}
    const configDict = get(configDictAtom)
    return Object.keys(configDict)
      .reduce((acc, key) => {
        const config = configDict[key]
        const verifiedConfig = allVerifiedList[config.apiKey || config.baseURL as string]
        if (config.active
          && config.model
          && (!verifiedConfig || !verifiedConfig[config.model as string] || verifiedConfig[config.model as string].success || verifiedConfig[config.model as string] === "ignore")
        ) {
          acc[key] = config
        }

        return acc
      }, {} as ModelConfigMap)
  }
)

export const enabledModelsIdsAtom = atom<{ key: string, name: string, provider: string }[]>(
  (get) => {
    const enabledConfigs = get(enabledConfigsAtom)
    return Object.keys(enabledConfigs).map((key) => ({
      key,
      name: `${getModelPrefix(enabledConfigs[key], 4)}/${enabledConfigs[key].model}`,
      provider: enabledConfigs[key].modelProvider
    }))
  }
)

export const configDictAtom = atom<ModelConfigMap>((get) => get(configAtom).configs)

export const isConfigNotInitializedAtom = atom(
  (get) => {
    const config = get(configAtom)
    return !config?.activeProvider
  }
)

export const isConfigActiveAtom = atom(
  (get) => {
    const config = get(configAtom)
    return config !== null && config.activeProvider !== EMPTY_PROVIDER
  }
)

export const activeProviderAtom = atom<string>(
  (get) => {
    const config = get(configAtom)
    return config?.activeProvider || EMPTY_PROVIDER
  }
)

export const currentModelSupportToolsAtom = atom<boolean>(
  (get) => {
    const localListOptions = localStorage.getItem("modelVerify")
    const allVerifiedList = localListOptions ? JSON.parse(localListOptions) : {}
    const activeConfig = get(activeConfigAtom)
    const verifiedConfig = allVerifiedList[activeConfig?.apiKey || activeConfig?.baseURL as string]
    // Can only check for tool support when the model is verified,
    // if the model is not verified, consider it as support tools
    return !verifiedConfig
      || !activeConfig
      || !verifiedConfig[activeConfig.model as string]
      || verifiedConfig[activeConfig.model as string].supportTools
      || verifiedConfig[activeConfig.model as string] === "ignore"
  }
)

export const loadConfigAtom = atom(
  null,
  async (get, set) => {
    try {
      const response = await fetchWithProxy("/api/config/model")
      const data = await response.json()
      set(configAtom, data.config)
      return data.config
    } catch (error) {
      console.warn("Failed to load config:", error)
      return null
    }
  }
)

export const saveFirstConfigAtom = atom(
  null,
  async (get, set, params: {
    data: InterfaceModelConfig
    provider: InterfaceProvider
  }) => {
    const { data: config, provider } = params
    const modelProvider = transformModelProvider(provider)
    config.active = true
    const configuration: any = { ...config } as Partial<Pick<ModelConfig, "configuration">> & Omit<ModelConfig, "configuration">

    if (config.modelProvider === "bedrock") {
      config.apiKey = (config as any).accessKeyId || (config as any).credentials.accessKeyId
      if (!((config as any).credentials)) {
        ; (config as any).credentials = {
          accessKeyId: (config as any).accessKeyId,
          secretAccessKey: (config as any).secretAccessKey,
          sessionToken: (config as any).sessionToken,
        }
      }

      delete (config as any).accessKeyId
      delete (config as any).secretAccessKey
      delete (config as any).sessionToken
      delete configuration.accessKeyId
      delete configuration.secretAccessKey
      delete configuration.sessionToken
    }

    return set(writeRawConfigAtom, {
      providerConfigs: {
        [`${modelProvider}-0-0`]: cleanUpModelConfig({
          ...config,
          modelProvider,
          configuration,
        })
      },
      activeProvider: `${modelProvider}-0-0` as any
    })
  }
)

export const writeRawConfigAtom = atom(
  null,
  async (get, set, params: {
    providerConfigs: InterfaceModelConfigMap
    activeProvider?: InterfaceProvider
  }) => {
    const { providerConfigs, activeProvider } = params

    const configs = Object.keys(providerConfigs).reduce((acc, key) => {
      const config = providerConfigs[key] as any
      config.modelProvider = transformModelProvider(config.modelProvider)

      // process bedrock config
      if (config.modelProvider === "bedrock") {
        if (!config.credentials && (config as any).accessKeyId) {
          config.credentials = {
            accessKeyId: (config as any).accessKeyId,
            secretAccessKey: (config as any).secretAccessKey,
            sessionToken: (config as any).sessionToken,
          }
        }

        config.apiKey = (config as any).accessKeyId || (config as any).credentials?.accessKeyId

        delete config.accessKeyId
        delete config.secretAccessKey
        delete config.sessionToken
        delete config.configuration.accessKeyId
        delete config.configuration.secretAccessKey
        delete config.configuration.sessionToken
      }

      // process bedrock config
      if (config.modelProvider === "google_genai") {
        delete config.configuration.baseURL
        delete config.configuration
      }

      acc[key] = cleanUpModelConfig(config) as ModelConfig
      return acc
    }, {} as ModelConfigMap)

    const localListOptions = localStorage.getItem("modelVerify")
    const allVerifiedList = localListOptions ? JSON.parse(localListOptions) : {}
    const activeConfig = configs[activeProvider as string]
    const verifiedModel = allVerifiedList[activeConfig?.apiKey ?? activeConfig?.baseURL]?.[activeConfig.model ?? ""]

    try {
      const response = await fetchWithProxy("/api/config/model/replaceAll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          configs,
          enable_tools: (getVerifyStatus(verifiedModel) !== "unSupportTool" && getVerifyStatus(verifiedModel) !== "unSupportModel") ? true : false,
          activeProvider: activeProvider ?? get(activeProviderAtom),
        }),
      })

      const data = await response.json()
      if (data.success) {
        set(configAtom, {
          ...get(configAtom),
          configs,
          activeProvider: activeProvider ?? get(activeProviderAtom)
        })
      }
      return data
    } catch (error) {
      console.error("Failed to save config:", error)
      throw error
    }
  }
)

export async function prepareModelConfig(config: InterfaceModelConfig, provider: InterfaceProvider): Promise<InterfaceModelConfig> {
  const _config = { ...config }

  // 获取代理设置
  let proxyType = "none"
  if (typeof window !== 'undefined' && window.ipcRenderer) {
    try {
      const proxySettings = await window.ipcRenderer.invoke('system:getProxySettings')
      proxyType = proxySettings?.type || "none"
    } catch (e) {
      // 获取失败默认none
    }
  }

  if ((proxyType === "custom" || proxyType === "system") && provider === "openai" && !_config.baseURL) {
    (_config as any).baseURL = "https://openai.mcp-x.com/v1";
  }


  if ((proxyType === "custom" || proxyType === "system") && provider === "anthropic" && !_config.baseURL) {
    (_config as any).baseURL = "https://anthropic.mcp-x.com";
  }

  if ((proxyType === "custom" || proxyType === "system") && provider === "google_genai" && !_config.baseURL) {
    (_config as any).baseURL = "https://googleapi.mcp-x.com";
    (_config as any).model = "gemini-2.0-flash";
  }

  if (_config.topP === 0) {
    delete (_config as any).topP
  }

  if (_config.temperature === 0) {
    delete (_config as any).temperature
  }

  return Object.keys(_config).reduce((acc, key) => {
    if (ignoreFieldsForModel.some(item => (item.model === _config.model || _config.model?.startsWith(item.prefix)) && item.fields.includes(key))) {
      return acc
    }

    return {
      ...acc,
      [key]: _config[key as keyof InterfaceModelConfig]
    }
  }, {} as InterfaceModelConfig)
}

export async function verifyModelWithConfig(config: InterfaceModelConfig, signal?: AbortSignal) {
  const modelProvider = transformModelProvider(config.modelProvider)
  const configuration = { ...config } as Partial<Pick<ModelConfig, "configuration">> & Omit<ModelConfig, "configuration">
  delete configuration.configuration

  const _formData = await prepareModelConfig(config, config.modelProvider)
  
  // bedrock 相关逻辑，必须保留
  if (modelProvider === "bedrock") {
    _formData.apiKey = (_formData as any).accessKeyId || (_formData as any).credentials.accessKeyId
    if (!((_formData as any).credentials)) {
      ; (_formData as any).credentials = {
        accessKeyId: (_formData as any).accessKeyId,
        secretAccessKey: (_formData as any).secretAccessKey,
        sessionToken: (_formData as any).sessionToken,
      }
    }
  }

  // 判断是否为通义千问系列（只要 model 以 qwen 开头即可）
  let enableThinking: boolean | undefined = undefined;
  const modelName = (config.model || configuration.model || "").toLowerCase();
  if (modelName.startsWith("qwen")) {
    const isStream = (config as any).stream === true || (configuration as any).stream === true;
    enableThinking = isStream ? true : false;
  }

  // 为不同厂商使用正确的 LangChain provider 类型
  function getLangChainProvider(modelProvider: string): string {
    // 根据模型提供商返回对应的 LangChain provider 名称
    switch (modelProvider) {
      case 'qwen':
      case 'deepseek':
      case 'moonshot':
        // 这些国产厂商都使用 OpenAI 兼容接口
        return "openai";
      case 'openai':
        return "openai";
      case 'anthropic':
        return "anthropic";
      case 'azure_openai':
        return "azure_openai";
      case 'cohere':
        return "cohere";
      case 'google-vertexai':
        return "google-vertexai";
      case 'google-genai':
        return "google-genai";
      case 'ollama':
        return "ollama";
      case 'together':
        return "together";
      case 'fireworks':
        return "fireworks";
      case 'mistralai':
        return "mistralai";
      case 'groq':
        return "groq";
      case 'bedrock':
        return "bedrock";
      default:
        // 默认使用 openai，因为大多数厂商都兼容 OpenAI 接口
        return "openai";
    }
  }

  const langchainProvider = getLangChainProvider(modelProvider);

  // 构造请求体
  const modelSettings: any = {
    ..._formData,
    modelProvider: langchainProvider,
    configuration: {
      ...configuration,
      modelProvider: langchainProvider,
    },
  };
  if (enableThinking !== undefined) {
    modelSettings.enable_thinking = enableThinking;
    modelSettings.configuration.enable_thinking = enableThinking;
  }

  return await fetchWithProxy("/api/modelVerify", {
    signal,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: langchainProvider,
      modelSettings,
    }),
  }).then(res => res.json())
}

export const writeEmptyConfigAtom = atom(
  null,
  async (get, set) => {
    const config = {
      configs: {},
      enable_tools: true,
      activeProvider: EMPTY_PROVIDER,
    }

    await fetchWithProxy("/api/config/model/replaceAll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    }
    )

    set(configAtom, config)
  }
)

function cleanUpModelConfig(config: any) {
  const _config = { ...config }
  delete _config.configuration.active
  delete _config.configuration.checked
  delete _config.configuration.modelProvider
  delete _config.configuration.model
  delete _config.configuration.apiKey
  delete _config.configuration.name
  return _config
}
