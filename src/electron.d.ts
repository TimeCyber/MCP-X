interface IpcRenderer {
  on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  off(channel: string, listener: (event: any, ...args: any[]) => void): void;
  send(channel: string, ...args: any[]): void;
  invoke(channel: string, ...args: any[]): Promise<any>;
  
  // 其他常用方法
  openScriptsDir(): Promise<void>;
  getPlatform(): Promise<string>;
  getResourcesPath(p: string): Promise<string>;
  // 还可以添加更多方法...
}

declare global {
  interface Window {
    ipcRenderer: IpcRenderer;
  }
}

export {}; 