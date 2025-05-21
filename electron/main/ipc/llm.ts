import { Anthropic } from "@anthropic-ai/sdk"
import { ipcMain, BrowserWindow, session } from "electron"
import { Ollama } from "ollama"
import OpenAI from "openai"
import { Mistral } from "@mistralai/mistralai"
import { HttpsProxyAgent } from 'https-proxy-agent';
import {
  BedrockClient,
  ListFoundationModelsCommand,
} from "@aws-sdk/client-bedrock"
import fetch from 'node-fetch';

export function ipcLlmHandler(win: BrowserWindow) {
  ipcMain.handle("llm:openaiModelList", async (_, apiKey: string) => {
        console.log("开始执行openaiModelList函数, apiKey长度:", apiKey?.length || 0)
        try {
          // 获取系统代理信息
          console.log("尝试获取系统代理信息")
          let proxyUrl = null
          try {
            const proxyInfo = await session.defaultSession.resolveProxy("https://api.openai.com")
            console.log("原始代理信息:", proxyInfo)
            if (proxyInfo.startsWith("PROXY ")) {
              proxyUrl = "http://" + proxyInfo.substring(6).trim()
              console.log("使用代理访问OpenAI API:", proxyUrl)
            } else {
              console.log("无代理或直接连接:", proxyInfo)
            }
          } catch (err) {
            console.error("获取代理设置失败:", err)
          }
      
          console.log("准备创建OpenAI客户端, 代理状态:", proxyUrl ? "使用代理" : "不使用代理")
          // 创建带有代理配置的Axios实例
          const configuration: any = {
            apiKey
          }
          
          if (proxyUrl) {
            console.log("尝试配置代理到OpenAI客户端")
            try {
              configuration.httpAgent = new HttpsProxyAgent(proxyUrl)
              console.log("成功创建代理代理")
            } catch (err) {
              console.error("创建代理代理失败:", err)
            }
          }
          
          console.log("创建OpenAI客户端")
          const client = new OpenAI(configuration)
          console.log("调用OpenAI API获取模型列表")
          const models = await client.models.list()
          console.log("成功获取模型列表, 数量:", models.data.length)
          return { results: models.data.map((model) => model.id), error: null }
        } catch (error) {
          console.error("OpenAI API请求失败，完整错误:", error)
          return { results: [], error: (error as Error).message }
        }
      })


  ipcMain.handle("llm:anthropicModelList", async (_, apiKey: string, baseURL: string) => {
    try {
      const client = new Anthropic({ apiKey, baseURL })
      const models = await client.models.list()
      return { results: models.data.map((model) => model.id), error: null }
    } catch (error) {
      return { results: [], error: (error as Error).message }
    }
  })

  ipcMain.handle("llm:ollamaModelList", async (_, baseURL: string) => {
    try {
      const ollama = new Ollama({ host: baseURL })
      const list = await ollama.list()
      return { results: list.models.map((model) => model.name), error: null }
    } catch (error) {
      return { results: [], error: (error as Error).message }
    }
  })

  ipcMain.handle("llm:openaiCompatibleModelList", async (_, apiKey: string, baseURL: string) => {
    try {
      const client = new OpenAI({ apiKey, baseURL })
      const list = await client.models.list()
      return { results: list.data.map((model) => model.id), error: null }
    } catch (error) {
      return { results: [], error: (error as Error).message }
    }
  })

  ipcMain.handle("llm:googleGenaiModelList", async (_, apiKey: string) => {
    try {
      // const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      const url = `https://googleapi.mcp-x.com/v1beta/models?key=${apiKey}`
     
      let response = await fetch(url)
      const data = await response.json() as { models?: { name: string }[] }
      return { results: (data.models || []).map((model) => model.name), error: null }
    } catch (error) {
      return { results: [], error: (error as Error).message }
    }
  })

  ipcMain.handle("llm:mistralaiModelList", async (_, apiKey: string) => {
    try {
      const client = new Mistral({ apiKey })
      const models = await client.models.list()
      return { results: models.data?.map((model) => model.id) ?? [], error: null }
    } catch (error) {
      return { results: [], error: (error as Error).message }
    }
  })

  ipcMain.handle("llm:bedrockModelList", async (_, accessKeyId: string, secretAccessKey: string, sessionToken: string, region: string) => {
    try {
      let modelPrefix = ""
      if (region.startsWith("us-")) {
        modelPrefix = "us."
      } else if (region.startsWith("eu-")) {
        modelPrefix = "eu."
      } else if (region.startsWith("ap-")) {
        modelPrefix = "apac."
      } else if (region.includes("-")) {
        modelPrefix = region.split("-")[0] + "."
      }

      const client = new BedrockClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
          sessionToken,
        }
      })
      const command = new ListFoundationModelsCommand({})
      const response = await client.send(command)
      const models = response.modelSummaries
      return { results: models?.map((model) => `${modelPrefix}${model.modelId}`) ?? [], error: null }
    } catch (error) {
      return { results: [], error: (error as Error).message }
    }
  })
}
