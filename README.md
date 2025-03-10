````markdown
# Flaming Bird Full-Page Proxy

Flaming Bird is a Node.js reverse proxy that rewrites the target website's HTML so that all resource requests (CSS, JavaScript, images, videos, and other assets) are routed through the proxy. This allows you to load the complete website—including videos, images, and dynamic content—without missing parts.

## How It Works

1. **Proxy Homepage:**  
   - The homepage (`public/index.html`) provides a form where you must enter a complete website URL (including the protocol, e.g., `https://example.com`).

2. **HTML & Asset Rewriting:**  
   - When you submit the form, your browser is directed to the `/fetch` endpoint.
   - The server (`server.js`):
     - Fetches the target website's HTML using a browser-like User-Agent.
     - Uses Cheerio to remove restrictive meta tags and to update or insert a `<base>` tag for relative URLs.
     - Rewrites all elements with external resource attributes (e.g. `src`, `srcset`, `href`) so that:
       - Assets are served via the `/asset` endpoint.
       - Navigation links for the same host are rewritten to go through `/fetch`.
       
3. **Asset Retrieval:**  
   - The `/asset` endpoint retrieves assets (CSS, JavaScript, images, videos, etc.) using node-fetch and streams them with the appropriate content type.

4. **Full Page Display:**  
   - The completely rewritten HTML is sent to your browser, ensuring that all parts of the website load properly, including videos, images, and styles.

5. **Navigation:**  
   - A "Back to Proxy" link is injected at the top of the page so you can easily return to the proxy homepage.

## Setup and Running

1. **Clone the Repository & Open in Codespaces**  
   Open this repository in your GitHub Codespace.

2. **Install Dependencies**  
   Open the terminal and run:
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
   The target website should load fully via the proxy, including all media, CSS, JavaScript, images, and videos.

## Limitations

- Some highly dynamic or interactive websites may still present challenges.
- Certain inline styles with background URLs or additional dynamic asset requests might require further rewriting.
- This proxy works best for content-driven websites where most assets are referenced via HTML attributes.
````markdown
