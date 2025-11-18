import http from "http";
import fs from "fs";
import path from "path";
import ejs from "ejs";

export type DevServerOptions = {
  templatePath: string;
  dataPath?: string;
  port?: number;
};

function getMimeType(filePath: string): string {
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".js")) return "application/javascript";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg"))
    return "image/jpeg";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".woff")) return "font/woff";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

export function startDevServer(options: DevServerOptions): void {
  const templatePath = path.resolve(options.templatePath);
  const dataPath = options.dataPath
    ? path.resolve(options.dataPath)
    : undefined;
  const port = options.port ?? 3111;
  const clients = new Set<http.ServerResponse>();

  const server = http.createServer((req, res) => {
    const url = req.url || "/";

    if (url === "/__livereload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("\n");
      clients.add(res);
      req.on("close", () => {
        clients.delete(res);
      });
      return;
    }

    if (url === "/" || url === "/index.html") {
      try {
        const html = renderHtml(templatePath, dataPath);
        sendHtml(res, injectLiveReload(html), 200);
      } catch (err) {
        const stack =
          err instanceof Error && err.stack ? err.stack : String(err ?? "");
        const errorHtml = buildErrorHtml(stack);
        sendHtml(res, injectLiveReload(errorHtml), 500);
      }
      return;
    }

    const publicDir = path.dirname(templatePath);
    const filePath = path.join(publicDir, url);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const stream = fs.createReadStream(filePath);
      res.statusCode = 200;
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Content-Type", getMimeType(filePath));
      stream.pipe(res);
      return;
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
  });

  server.listen(port, () => {
    console.log(`EJS to HTML listening on http://localhost:${port}`);
    console.log(`Template: ${templatePath}`);
    if (dataPath) console.log(`Data:     ${dataPath}`);
  });

  if (fs.existsSync(templatePath)) {
    fs.watch(templatePath, { persistent: true }, (eventType) => {
      if (eventType === "change") {
        console.log("[watch] template changed -> reload");
        broadcastReload(clients);
      }
    });
  }

  if (dataPath && fs.existsSync(dataPath)) {
    fs.watch(dataPath, { persistent: true }, (eventType) => {
      if (eventType === "change") {
        console.log("[watch] data changed -> reload");
        broadcastReload(clients);
      }
    });
  }
}

function renderHtml(templatePath: string, dataPath?: string): string {
  const template = fs.readFileSync(templatePath, "utf8");
  const data = loadData(dataPath);
  return ejs.render(template, data);
}

function loadData(dataPath?: string): Record<string, unknown> {
  if (!dataPath || !fs.existsSync(dataPath)) return {};
  try {
    const buf = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(buf) as Record<string, unknown>;
  } catch {
    console.warn("[data] Failed to load data.json");
    return {};
  }
}

function injectLiveReload(html: string): string {
  const snippet = `
<script>
  (function () {
    var es = new EventSource('/__livereload');
    es.onmessage = function (event) {
      if (event.data === 'reload') {
        location.reload();
      }
    };
    es.onerror = function () {
      setTimeout(function () { location.reload(); }, 2000);
    };
  })();
</script>`;

  const i = html.lastIndexOf("</body>");
  if (i !== -1) {
    return html.slice(0, i) + snippet + html.slice(i);
  }
  return html + snippet;
}

function buildErrorHtml(stack: string): string {
  return `
<!doctype html>
<html lang="fa">
  <head>
    <meta charset="utf-8" />
    <title>EJS Render Error</title>
    <style>
      body {
        background: #111827;
        color: #e5e7eb;
        padding: 24px;
        direction: ltr;
      }
      h1 { color: #f97316; }
      pre {
        background: #020617;
        padding: 16px;
        border-radius: 8px;
        overflow-x: auto;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <h1>EJS Render Error</h1>
    <pre>${escapeHtml(stack)}</pre>
    <p>Fix your <code>.ejs</code> or <code>data.json</code>. The page will auto-reload on the next change.</p>
  </body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sendHtml(
  res: http.ServerResponse,
  html: string,
  status: number
): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.end(html);
}

function broadcastReload(clients: Set<http.ServerResponse>): void {
  for (const res of clients) {
    try {
      res.write("data: reload\n\n");
    } catch {
      // ignore
    }
  }
}
