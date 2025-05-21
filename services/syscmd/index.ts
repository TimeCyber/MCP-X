export class SystemCommandManager {
  private static instance: SystemCommandManager;
  private commands: Map<string, string>;

  private constructor() {
    this.commands = new Map();
  }

  public static getInstance(): SystemCommandManager {
    if (!SystemCommandManager.instance) {
      SystemCommandManager.instance = new SystemCommandManager();
    }
    return SystemCommandManager.instance;
  }

  public initialize(commands: Record<string, string>): void {
    Object.entries(commands).forEach(([key, value]) => {
      this.commands.set(key, value);
    });
  }

  public getValue(key: string): string | undefined {
    return this.commands.get(key);
  }

  public getAllCommands(): Map<string, string> {
    return new Map(this.commands);
  }
}
