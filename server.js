const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = 8080;

app.use(express.static('public'));
app.use(express.json());

let progress = { completed: 0, total: 0 };

app.post('/check-links', async (req, res) => {
  const { urls } = req.body;
  progress.completed = 0;
  progress.total = urls.length;

  const results = { unblocked: [] };

  await Promise.all(urls.map(async (url) => {
    const cleanUrl = url.replace(/https?:\/\//, '').replace(/\/$/, '');
    const apiUrl = `https://filterchecker.rare1k.dev/check/${cleanUrl}/results.txt`;

    try {
      const response = await fetch(apiUrl);
      const text = await response.text();

      const lsFilterMatch = text.match(/LS Filter:.*(Likely \*\*Unblocked\*\*)/);
      if (lsFilterMatch) {
        results.unblocked.push(cleanUrl);
      }
    } catch (error) {
      console.error(`Error fetching data for ${url}:`, error);
    } finally {
      progress.completed++;
    }
  }));

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
