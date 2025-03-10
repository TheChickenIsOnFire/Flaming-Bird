````markdown
# Flaming Bird Full-Page Proxy

Flaming Bird is a Node.js reverse proxy designed to load a target website completely by rewriting its HTML so that all resource requests (CSS, JavaScript, images, videos, fonts, etc.) are routed through a generic endpoint. This helps mask the original URLs to avoid triggering client-side blockers.

## How It Works

1. **Proxy Homepage:**  
   The homepage (in `public/index.html`) presents a form where you must enter a complete website URL (including `http://` or `https://`). When you submit, you’re directed to the `/fetch` endpoint.

2. **HTML & Asset Rewriting:**  
   - The server (`server.js`) fetches the target website’s HTML using a browser-like User-Agent header.
   - It uses Cheerio to remove restrictive meta tags and inserts or updates a `<base>` tag for proper relative URL resolution.
   - It rewrites all resource URLs in attributes (`src`, `srcset`, `href`, and within `<source>` elements) so that they are routed via our generic resource endpoint (`/res`).
   - For same-domain navigation links (anchor tags), the URL is rewritten to go through `/fetch` for consistent proxy handling.
   - A "Back to Proxy" link is injected at the top of the page.

3. **Asset Retrieval:**  
   - The `/res` endpoint fetches resources (CSS, JavaScript, images, videos, fonts, etc.) using node‑fetch.
   - A Referer header is provided to simulate a direct request.
   - Resources are streamed back with the appropriate Content-Type.

4. **Limitations:**  
   - Some resources may still be blocked by ad blockers or cannot be fetched due to CORS or 404 errors.
   - If the target site deliberately blocks access to a resource or it does not exist, the corresponding errors (e.g. ERR_BLOCKED_BY_CLIENT or 404) will appear.
   - There is little that can be done for intentionally blocked content by client-side extensions.

## Setup and Running

1. **Clone the Repository & Open in Codespaces**  
   Open this repository in your GitHub Codespace.

2. **Install Dependencies**  
   Run the following command in the Codespaces terminal:
   ```bash
   npm install
   ```

3. **Start the Server**  
   Launch the server with:
   ```bash
   npm start
   ```

4. **Using the Proxy**  
   Open your Codespace URL. On the homepage, enter a complete website URL (including the protocol) and click "Go".  
   The target website should load via the proxy with its assets routed through the `/res` endpoint. Use the "← Back to Proxy" link to return.
````markdown
