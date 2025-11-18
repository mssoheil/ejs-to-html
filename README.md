# EJS To HTML

A tiny dev server that:

- Renders an EJS template (`.ejs`) with JSON data.
- Adds **live reload** using Server-Sent Events (SSE).
- Renders the static assets like styles or images that are inside example folder `getMimeType` function inside server.ts

## Usage

```bash
npm run dev
```

- Open http://localhost:3000 in your browser.
- Edit the EJS template or data JSON.
- The browser auto-reloads with the new rendered HTML.
- If you need static assets you can put them inside the example folder
- If you need static assets with extension that are not supported you can update the
