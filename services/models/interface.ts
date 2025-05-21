interface ModelSettingDefinition {
  type: "string" | "number" | "object";
  description: string;
  required: boolean;
  default?: any;
  placeholder?: any;
  properties?: {
    [key: string]: {
      type: "string" | "number";
      description: string;
      required: boolean;
      default?: any;
      placeholder?: any;
    };
  };
}

interface ModelInterfaceDefinition {
  model_settings: {
    [key: string]: ModelSettingDefinition;
  };
}

export const ModelInterface: ModelInterfaceDefinition = {
  model_settings: {
    modelProvider: {
      type: "string",
      description: "The provider sdk of the model",
      required: true,
      default: "",
      placeholder: "openai",
    },
    model: {
      type: "string",
      description: "The model's name to use",
      required: true,
      default: "gpt-4o-mini",
    },
    apiKey: {
      type: "string",
      description: "The Model Provider API key",
      required: false,
      default: "",
      placeholder: "YOUR_API_KEY",
    },
    baseURL: {
      type: "string",
      description: "The model's base URL",
      required: false,
      default: "",
      placeholder: "",
    },
    // temperature: {
    //   type: "number",
    //   description: "Controls the randomness of the model's output (0-1)",
    //   required: false,
    //   default: 1,
    //   placeholder: 1,
    // },
    // topP: {
    //   type: "number",
    //   description:
    //     "Controls the range of next token choices during generation (0-1)",
    //   required: false,
    //   default: 1,
    //   placeholder: 1,
    // },
    // maxTokens: {
    //   type: "number",
    //   description:
    //     "Limits the total number of tokens (words and punctuation) in the response.",
    //   required: false,
    //   default: -1,
    //   placeholder: -1,
    // },
  },
};
