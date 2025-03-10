import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// Determine __dirname for ES Modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Validate that a URL starts with "http://" or "https://"
const isValidUrl = (url) => /^https?:\/\//i.test(url);

// Helper: Convert a relative URL to an absolute URL based on a base.
function makeAbsolute(url, base) {
  try {
    return new URL(url, base).toString();
  } catch (e) {
    return url;
  }
}

// Rewrite an asset URL to our generic resource endpoint.
// Note: The endpoint is /res so that the query string does not include "asset"
function rewriteAssetUrl(originalUrl, baseUrl) {
  const absoluteUrl = makeAbsolute(originalUrl, baseUrl);
  return '/res?url=' + encodeURIComponent(absoluteUrl);
}

// Serve static files from the "public" directory.
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to fetch and rewrite HTML from a target URL.
app.get('/fetch', async (req, res) => {
  const targetUrl = req.query.target;
  if (!targetUrl || !isValidUrl(targetUrl)) {
    return res
      .status(400)
      .send('Please provide a valid target URL that starts with "http://" or "https://".');
  }
  
  try {
    // Use a browser-like User-Agent so that target servers return full content.
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FlamingBird/1.0)' }
    });
    
    if (!response.ok) {
      console.error(`Fetch error: ${response.status} ${response.statusText}`);
      return res
        .status(500)
        .send(`Error fetching target website: ${response.status} ${response.statusText}`);
    }
    
    let html = await response.text();
    // Load HTML into Cheerio (preserving original encoding with decodeEntities: false).
    const $ = cheerio.load(html, { decodeEntities: false });
    
    // Remove meta tags that enforce framing/restrictions.
    $('meta[http-equiv="X-Frame-Options"]').remove();
    $('meta[http-equiv="Content-Security-Policy"]').remove();
    
    // Insert or update a <base> element so that relative URLs resolve against the target.
    if ($('base').length === 0) {
      $('head').prepend(`<base href="${targetUrl}">`);
    } else {
      $('base').attr('href', targetUrl);
    }
    
    // Rewrite asset URLs for all elements that reference external resources:
    // 1. Elements with a "src" attribute.
    $('[src]').each((i, el) => {
      const origUrl = $(el).attr('src');
      if (origUrl && origUrl.trim().length > 0) {
        $(el).attr('src', rewriteAssetUrl(origUrl, targetUrl));
      }
    });
    
    // 2. Elements with a "srcset" attribute (for responsive images or video sources)
    $('[srcset]').each((i, el) => {
      const srcset = $(el).attr('srcset');
      if (srcset) {
        const rewrittenSrcset = srcset.split(',')
          .map(item => {
            const parts = item.trim().split(/\s+/);
            if (parts.length) {
              parts[0] = rewriteAssetUrl(parts[0], targetUrl);
            }
            return parts.join(' ');
          })
          .join(', ');
        $(el).attr('srcset', rewrittenSrcset);
      }
    });
    
    // 3. Elements with an "href" attribute.
    $('[href]').each((i, el) => {
      const tagName = $(el)[0].tagName.toLowerCase();
      const origUrl = $(el).attr('href');
      if (!origUrl || origUrl.trim().length === 0) return;
      const absolute = makeAbsolute(origUrl, targetUrl);
      if (tagName === 'a') {
        try {
          const absUrlObj = new URL(absolute);
          const targetUrlObj = new URL(targetUrl);
          if (absUrlObj.host === targetUrlObj.host) {
            // For same-domain navigation links, route via /fetch.
            $(el).attr('href', '/fetch?target=' + encodeURIComponent(absolute));
          }
        } catch (e) {
          // Error in URL parsing; leave link unchanged.
        }
      } else {
        // For non-anchor tags (e.g., <link> for CSS), rewrite to our resource endpoint.
        $(el).attr('href', rewriteAssetUrl(origUrl, targetUrl));
      }
    });
    
    // 4. Handle <source> elements (e.g. within <video> or <picture>) so their URLs are rewritten.
    $('source').each((i, el) => {
      const origUrl = $(el).attr('src');
      if (origUrl && origUrl.trim().length > 0) {
        $(el).attr('src', rewriteAssetUrl(origUrl, targetUrl));
      }
      const srcset = $(el).attr('srcset');
      if (srcset) {
        const rewrittenSrcset = srcset.split(',')
          .map(item => {
            const parts = item.trim().split(/\s+/);
            if (parts.length) {
              parts[0] = rewriteAssetUrl(parts[0], targetUrl);
            }
            return parts.join(' ');
          })
          .join(', ');
        $(el).attr('srcset', rewrittenSrcset);
      }
    });
    
    // Inject a "Back to Proxy" link at the top for easy navigation back.
    $('body').prepend('<div style="padding:10px; background:#eee;"><a href="/" style="font-size:16px; text-decoration:none;">← Back to Proxy</a></div>');
    
    res.send($.html());
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching or processing the target website.');
  }
});

// Endpoint to fetch assets (CSS, JS, images, videos, fonts, etc.) via our proxy.
// Using "/res" instead of "/asset" to avoid triggering client-side filters.
app.get('/res', async (req, res) => {
  const resourceUrl = req.query.url;
  if (!resourceUrl || !isValidUrl(resourceUrl)) {
    return res.status(400).send('Please provide a valid resource URL.');
  }
  try {
    // Forward a Referer header matching the resource URL to simulate direct access.
    const fetchRes = await fetch(resourceUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; FlamingBird/1.0)',
        'Referer': resourceUrl
      }
    });
    if (!fetchRes.ok) {
      console.error(`Resource fetch error: ${fetchRes.status} ${fetchRes.statusText}`);
      return res
        .status(500)
        .send(`Error fetching resource: ${fetchRes.status} ${fetchRes.statusText}`);
    }
    // Pass along the content type.
    const contentType = fetchRes.headers.get('content-type');
    if (contentType) {
      res.set('Content-Type', contentType);
    }
    // Stream the fetched resource to the client.
    fetchRes.body.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching resource.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
