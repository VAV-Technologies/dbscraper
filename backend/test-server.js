const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: 'https://dbscraper.netlify.app',
  credentials: true
}));

app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'D&B Scraper API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/scrape/jobs', (req, res) => {
  res.json([
    {
      jobId: 'test-job-1',
      url: 'https://www.dnb.com/business-directory/company-information.information.jp.html',
      status: 'completed',
      progress: {
        companiesScraped: 25,
        totalCompanies: 25,
        pagesProcessed: 1,
        errors: 0
      },
      startedAt: new Date(Date.now() - 300000).toISOString(),
      completedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 300000).toISOString()
    }
  ]);
});

app.post('/api/scrape/start', (req, res) => {
  const { url, expectedCount } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  const jobId = `test-${Date.now()}`;
  
  res.json({
    jobId,
    message: 'Test scraping job started (demo mode)',
    status: 'pending'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'https://dbscraper.netlify.app'}`);
  console.log('API endpoints:');
  console.log(`  GET  http://localhost:${PORT}/api/test`);
  console.log(`  GET  http://localhost:${PORT}/api/scrape/jobs`);
  console.log(`  POST http://localhost:${PORT}/api/scrape/start`);
});