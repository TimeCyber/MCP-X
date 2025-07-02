import { InterfaceModelConfig, InterfaceModelConfigMap, ModelConfig, ModelConfigMap, MultiModelConfig } from "../atoms/configState"
import { InterfaceProvider, ModelProvider } from "../atoms/interfaceState"

export const formatData = (data: InterfaceModelConfig|ModelConfig): MultiModelConfig => {
  const convertedData = convertConfigToInterfaceModel(data)
  const { modelProvider, model, apiKey, baseURL, active, topP, temperature, ...extra } = convertedData
  
  // 确保所有必需字段都有默认值
  return {
    ...extra,
    name: modelProvider,
    apiKey: apiKey || "",
    baseURL: baseURL || "",
    active: active ?? false,
    checked: false,
    models: model ? [model] : [],
    topP: topP ?? 0,
    temperature: temperature ?? 0,
    model: model || null,
  }
}

export const extractData = (data: InterfaceModelConfigMap|ModelConfigMap) => {
  const providerConfigList: MultiModelConfig[] = []

  Object.entries(data).forEach(([key, value]) => {
    if(!key.includes("-")){
      key = `${key}-${providerConfigList.length}-0`
    }
    const [name , index, modelIndex] = key.split("-")
    const _index = parseInt(index)

    if (!providerConfigList[_index]) {
      const _value: InterfaceModelConfig|ModelConfig = {...value}
      _value.modelProvider = name as InterfaceProvider
      providerConfigList[_index] = {
        ...formatData(_value),
      }
    } else if(value.model) {
      providerConfigList[_index].models.push(value.model)
    }
  })

  return providerConfigList
}

export const compressData = (data: MultiModelConfig, index: number) => {
  const compressedData: Record<string, InterfaceModelConfig> = {}

  const { models, ...restData } = data
  const modelsToProcess = models.length === 0 ? [null] : models
  modelsToProcess.forEach((model, modelIndex) => {
    const formData = {
      ...restData,
      model: model,
      modelProvider: data.name
    }
    const configuration = {...formData} as Partial<Pick<InterfaceModelConfig, "configuration">> & Omit<InterfaceModelConfig, "configuration">
    delete configuration.configuration
    compressedData[`${restData.name}-${index}-${modelIndex}`] = {
      ...formData,
      configuration: configuration as InterfaceModelConfig,
    }
  })

  return compressedData
}

export function transformModelProvider(provider: InterfaceProvider): ModelProvider {
  switch (provider) {
    case "deepseek":
    case "qwen":
    case "moonshot":
      return "openai"
    case "google_genai":
      return "google-genai"
    default:
      return provider
  }
}

export function convertConfigToInterfaceModel(model: InterfaceModelConfig|ModelConfig): InterfaceModelConfig {
  switch (model.modelProvider) {
    case "google-genai":
      return {
        ...model,
        modelProvider: "google_genai"
      }
    default:
      return model as InterfaceModelConfig
  }
}

