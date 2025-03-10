````markdown
# Flaming Bird Full-Page Proxy

Flaming Bird is a Node.js reverse proxy that rewrites a target website's HTML so that all resource requests (CSS, JavaScript, images, videos, fonts, etc.) are routed through a generic endpoint. This helps bypass client-side blocking (such as ad blockers or extensions) that target specific asset URLs.

## How It Works

1. **Proxy Homepage:**  
   The homepage (`public/index.html`) contains a form where you enter a complete website URL (with protocol, e.g. `https://example.com`).

2. **HTML & Asset Rewriting:**  
   - When you submit the form, the browser is directed to the `/fetch?target=...` endpoint.
   - The server (`server.js`) fetches the target HTML using a browser-like User-Agent header.
   - Cheerio processes the HTML:
     - Removes restrictive meta tags (`X-Frame-Options`, `Content-Security-Policy`).
     - Inserts or updates a `<base>` tag so relative URLs resolve properly.
     - Rewrites all resource URLs (in `src`, `srcset`, `href`, and `<source>` tags) to be routed through the generic asset endpoint `/res`.
     - For navigation links (<a> tags) that point to the same domain, the URL is rewritten to go through `/fetch` again.
   - A "Back to Proxy" link is injected for easy return to the proxy interface.

3. **Asset Retrieval:**  
   - The `/res` endpoint fetches any requested asset (CSS, JavaScript, images, videos, fonts, etc.) using node-fetch.
   - A custom Referer header is sent along to simulate a direct request.
   - The asset is streamed back with the appropriate content type.

4. **Full Page Display:**  
   The rewritten HTML is sent to your browser, so the target website loads fully—with CSS, JavaScript, images, videos, and other assets—while hiding direct references to blocked domains.

## Setup and Running

1. **Clone the Repository & Open in Codespaces**  
   Open this repository in your GitHub Codespace.

2. **Install Dependencies**  
   In the Codespaces terminal, run:
   ```bash
   npm install
   ```

3. **Start the Server**  
   Launch the proxy server with:
   ```bash
   npm start
   ```

4. **Use the Proxy**  
   Navigate to your Codespace URL. On the homepage, enter a complete website URL (including `http://` or `https://`) and click "Go".  
   The target website should load completely, with all media, assets, and functionality working via the proxy.

## Limitations

- Some highly dynamic or interactive websites may still have issues.
- Additional inline scripts or assets loaded via JavaScript may not be rewritten.
- Certain resources (such as fonts or videos) that are not available on the target server will return 404 errors.
````markdown
