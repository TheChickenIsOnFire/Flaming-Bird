import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// Needed for ES modules to determine __dirname.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Validate URL starts with http or https.
const isValidUrl = (url) => /^https?:\/\//i.test(url);

// Helper: Convert a relative URL to an absolute URL using the base.
function makeAbsolute(url, base) {
  try {
    return new URL(url, base).toString();
  } catch (e) {
    return url;
  }
}

// Rewrite attribute by prepending the asset proxy endpoint.
function rewriteAssetUrl(originalUrl, baseUrl) {
  const absoluteUrl = makeAbsolute(originalUrl, baseUrl);
  return '/asset?url=' + encodeURIComponent(absoluteUrl);
}

// Serve static files from the "public" directory.
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to fetch and rewrite HTML from a target URL.
app.get('/fetch', async (req, res) => {
  const targetUrl = req.query.target;
  if (!targetUrl || !isValidUrl(targetUrl)) {
    return res.status(400).send(
      'Please provide a valid target URL that starts with "http://" or "https://".'
    );
  }
  
  try {
    // Use a browser-like User-Agent header.
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
    // Load HTML into Cheerio. `decodeEntities: false` helps preserve the original encoding.
    const $ = cheerio.load(html, { decodeEntities: false });
    
    // Remove meta tags that enforce framing or content restrictions.
    $('meta[http-equiv="X-Frame-Options"]').remove();
    $('meta[http-equiv="Content-Security-Policy"]').remove();
    
    // Insert or update a <base> tag so that relative URLs resolve correctly.
    if ($('base').length === 0) {
      $('head').prepend(`<base href="${targetUrl}">`);
    } else {
      $('base').attr('href', targetUrl);
    }
    
    // Rewrite URLs for all elements that load external resources:
    // 1. Elements with a "src" attribute.
    $('[src]').each((i, el) => {
      const origUrl = $(el).attr('src');
      if (origUrl && origUrl.trim().length > 0) {
        $(el).attr('src', rewriteAssetUrl(origUrl, targetUrl));
      }
    });
    
    // 2. Elements with a "srcset" attribute (e.g. responsive images)
    $('[srcset]').each((i, el) => {
      const srcset = $(el).attr('srcset');
      if (srcset) {
        // Process each candidate in the srcset attribute.
        const rewrittenSrcset = srcset.split(',')
          .map(item => {
            // Each item can be "url [descriptor]"
            const parts = item.trim().split(/\s+/);
            if (parts.length) {
              parts[0] = rewriteAssetUrl(parts[0], targetUrl);
            }
            return parts.join(' ');
          }).join(', ');
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
        // For anchor tags, if the link is within the same host, rewrite to the /fetch endpoint.
        try {
          const absUrlObj = new URL(absolute);
          const targetUrlObj = new URL(targetUrl);
          if (absUrlObj.host === targetUrlObj.host) {
            $(el).attr('href', '/fetch?target=' + encodeURIComponent(absolute));
          }
        } catch (e) {
          // On error, leave the href unchanged.
        }
      } else {
        // For other tags (like <link> for stylesheets) route via the asset proxy.
        $(el).attr('href', rewriteAssetUrl(origUrl, targetUrl));
      }
    });
    
    // 4. Handle <source> elements (inside video, audio, picture)
    $('source').each((i, el) => {
      const origUrl = $(el).attr('src');
      if (origUrl && origUrl.trim().length > 0) {
        $(el).attr('src', rewriteAssetUrl(origUrl, targetUrl));
      }
      // Also check "srcset" on <source> if present.
      const srcset = $(el).attr('srcset');
      if (srcset) {
        const rewrittenSrcset = srcset.split(',')
          .map(item => {
            const parts = item.trim().split(/\s+/);
            if (parts.length) {
              parts[0] = rewriteAssetUrl(parts[0], targetUrl);
            }
            return parts.join(' ');
          }).join(', ');
        $(el).attr('srcset', rewrittenSrcset);
      }
    });
    
    // Optionally inject a "Back to Proxy" link at the top.
    $('body').prepend('<div style="padding:10px; background:#eee;"><a href="/" style="font-size:16px; text-decoration:none;">← Back to Proxy</a></div>');
    
    res.send($.html());
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching or processing the target website.');
  }
});

// Endpoint to fetch assets (CSS, JS, images, videos, etc.)
app.get('/asset', async (req, res) => {
  const assetUrl = req.query.url;
  if (!assetUrl || !isValidUrl(assetUrl)) {
    return res.status(400).send('Please provide a valid asset URL.');
  }
  try {
    const fetchRes = await fetch(assetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FlamingBird/1.0)' }
    });
    if (!fetchRes.ok) {
      console.error(`Asset fetch error: ${fetchRes.status} ${fetchRes.statusText}`);
      return res
        .status(500)
        .send(`Error fetching asset: ${fetchRes.status} ${fetchRes.statusText}`);
    }
    // Set response content type if available.
    const contentType = fetchRes.headers.get('content-type');
    if (contentType) {
      res.set('Content-Type', contentType);
    }
    // Pipe asset content directly to the client.
    fetchRes.body.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching asset.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
