import { createHashRouter } from "react-router-dom"
import Layout from "./views/Layout"
import Chat from "./views/Chat"
import Welcome from "./views/Welcome"
import Setup from "./views/Setup"

export const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Welcome />
      },
      {
        path: "chat",
        element: <Chat />
      },
      {
        path: "chat/:chatId",
        element: <Chat />
      },
      {
        path: "setup",
        element: <Setup />
      }
    ]
  }
])
