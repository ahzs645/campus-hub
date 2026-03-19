import TcpSocket from "react-native-tcp-socket";

type RequestHandler = (
  method: string,
  path: string,
  body: string,
  headers: Record<string, string>
) => { status: number; contentType: string; body: string };

let server: ReturnType<typeof TcpSocket.createServer> | null = null;

export function startServer(port: number, handler: RequestHandler) {
  if (server) {
    try {
      server.close();
    } catch {}
  }

  server = TcpSocket.createServer((socket) => {
    let data = "";

    socket.on("data", (chunk) => {
      data += chunk.toString();

      // Check if we have a complete HTTP request
      const headerEnd = data.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const headerSection = data.substring(0, headerEnd);
      const lines = headerSection.split("\r\n");
      const [method, path] = (lines[0] || "GET /").split(" ");

      const headers: Record<string, string> = {};
      for (let i = 1; i < lines.length; i++) {
        const colonIdx = lines[i].indexOf(":");
        if (colonIdx > 0) {
          headers[lines[i].substring(0, colonIdx).toLowerCase().trim()] =
            lines[i].substring(colonIdx + 1).trim();
        }
      }

      const contentLength = parseInt(headers["content-length"] || "0", 10);
      const bodyStart = headerEnd + 4;
      const body = data.substring(bodyStart, bodyStart + contentLength);

      // Wait for full body
      if (body.length < contentLength) return;

      try {
        const response = handler(method || "GET", path || "/", body, headers);
        const responseStr =
          `HTTP/1.1 ${response.status} OK\r\n` +
          `Content-Type: ${response.contentType}\r\n` +
          `Access-Control-Allow-Origin: *\r\n` +
          `Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n` +
          `Access-Control-Allow-Headers: Content-Type\r\n` +
          `Content-Length: ${Buffer.byteLength(response.body)}\r\n` +
          `Connection: close\r\n` +
          `\r\n` +
          response.body;

        socket.write(responseStr, "utf8", () => {
          socket.destroy();
        });
      } catch (e) {
        const errBody = "Internal Server Error";
        socket.write(
          `HTTP/1.1 500 Internal Server Error\r\nContent-Length: ${errBody.length}\r\nConnection: close\r\n\r\n${errBody}`,
          "utf8",
          () => socket.destroy()
        );
      }

      data = "";
    });

    socket.on("error", () => {
      try {
        socket.destroy();
      } catch {}
    });
  });

  server.listen({ port, host: "0.0.0.0" });

  return {
    stop: () => {
      try {
        server?.close();
        server = null;
      } catch {}
    },
  };
}
