import { Server } from "socket.io"

export const config = {
  api: {
    bodyParser: false,
  },
}

let io

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log("[socket.io] starting server...")

    io = new Server(res.socket.server, {
      path: "/api/socket",
    })

    io.on("connection", (socket) => {
      console.log("User connected")

      socket.on("join-room", ({ roomId, nickname }) => {
        socket.join(roomId)
        socket.to(roomId).emit("receive-notice", `${nickname} joined the room`)
      })

      socket.on("send-message", ({ roomId, from, text, file }) => {
        io.to(roomId).emit("receive-message", { from, text, file })
      })

      socket.on("leave-room", ({ roomId, nickname }) => {
        socket.leave(roomId)
        socket.to(roomId).emit("receive-notice", `${nickname} left the room`)
      })
    })

    res.socket.server.io = io
  }

  res.end()
}