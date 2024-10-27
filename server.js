const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = 8080;

app.use(express.static('public'));
app.use(express.json());

let progress = { completed: 0, total: 0 };

const unblockedCategoryNumbers = [6, 9, 10, 14, 15, 18, 20, 29, 30, 36, 37, 40, 41, 43, 44, 45, 46, 47, 48, 49, 50, 51, 57, 58, 59, 69, 73, 75, 76, 77, 79, 83, 84, 85, 99, 129, 131, 132, 139, 140, 900];

async function fetchCategorization(url) {
  try {
    const response = await fetch("https://production-archive-proxy-api.lightspeedsystems.com/archiveproxy", {
      method: "POST",
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'authority': 'production-archive-proxy-api.lightspeedsystems.com',
        'content-type': 'application/json',
        'origin': 'https://archive.lightspeedsystems.com',
        'user-agent': 'Mozilla/5.0',
        'x-api-key': 'onEkoztnFpTi3VG7XQEq6skQWN3aFm3h'
      },
      body: `{"query":"\\nquery getDeviceCategorization($itemA: CustomHostLookupInput!, $itemB: CustomHostLookupInput!){\\n  a: custom_HostLookup(item: $itemA) { cat}\\n  b: custom_HostLookup(item: $itemB) { cat   \\n  }\\n}","variables":{"itemA":{"hostname":"${url}"}, "itemB":{"hostname":"${url}"}}}`
    });

    if (!response.ok) {
      console.error('Network response was not ok:', response.statusText);
      return;
    }

    const body = await response.json();
    const categories = [body.data.a.cat, body.data.b.cat];
    return categories;
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

app.post('/check-links', async (req, res) => {
  const { urls } = req.body;
  progress.completed = 0;
  progress.total = urls.length;

  const results = { unblocked: [] };

  for (const url of urls) {
    const cleanUrl = url.replace(/https?:\/\//, '').replace(/\/$/, '');

    try {
      const categories = await fetchCategorization(cleanUrl);

      const isUnblocked = categories.some(cat => unblockedCategoryNumbers.includes(cat));

      if (isUnblocked) {
        results.unblocked.push(cleanUrl);
      }
    } catch (error) {
      console.error(`Error fetching data for ${cleanUrl}:`, error);
    } finally {
      progress.completed++;
    }
  }

  res.json(results);
});

app.get('/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    const percentage = Math.round((progress.completed / progress.total) * 100);
    res.write(`data: ${JSON.stringify({ percentage })}\n\n`);

    if (progress.completed === progress.total) {
      clearInterval(interval);
      res.end();
    }
  }, 100);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});