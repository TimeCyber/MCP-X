const mod = process.platform === "darwin" ? "m" : "c"
export default {
  "chat-input:submit": `<${mod}-enter>`,
  "chat-input:upload-file": `<${mod}-u>`,
  "chat-input:focus": `<${mod}-k>`,
  "chat-input:paste-last-message": `<${mod}-V>`,
  "chat-message:copy-last": `<${mod}-C>`,
  "chat:delete": `<${mod}-s-backspace>`,
  "global:new-chat": `<${mod}-O>`,
  "global:toggle-sidebar": `<${mod}-S>`,
  "global:close-layer": `<escape>`,
  "global:toggle-keymap-modal": `<${mod}-/>`,
}
