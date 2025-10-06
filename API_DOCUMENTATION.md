# D&B Scraper API Documentation

## Base URL
```
Production: http://185.202.236.231:5000/api
Development: http://localhost:5000/api
```

## Authentication

All API endpoints require authentication via API key.

### API Key Header
```http
X-API-Key: your-api-key-here
```

### Example Request
```bash
curl -H "X-API-Key: your-api-key" http://185.202.236.231:5000/api/scrape/jobs
```

---

## Endpoints

### 1. Start Scraping Job

Start a new scraping job for a D&B directory URL.

**Endpoint:** `POST /scrape/start`

**Request Body:**
```json
{
  "url": "https://www.dnb.com/business-directory/company-information.information.jp.html",
  "expectedCount": 100,
  "options": {
    "maxPages": 10,
    "headless": true,
    "maxConcurrency": 3,
    "minDelay": 3000,
    "maxDelay": 10000
  }
}
```

**Parameters:**
- `url` (required): D&B directory URL to scrape
- `expectedCount` (optional): Expected number of companies for progress tracking
- `options` (optional): Scraping configuration
  - `maxPages`: Maximum pages to scrape (default: unlimited)
  - `headless`: Run browser in headless mode (default: true)
  - `maxConcurrency`: Number of concurrent scrapers (default: 3)
  - `minDelay`: Minimum delay between requests in ms (default: 3000)
  - `maxDelay`: Maximum delay between requests in ms (default: 10000)

**Success Response (200):**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Scraping job started",
  "status": "pending"
}
```

**Error Responses:**
- `400`: Missing or invalid URL
- `403`: Robots.txt disallows scraping
- `401/403`: Invalid or missing API key

---

### 2. Get Job Status

Get the current status of a scraping job.

**Endpoint:** `GET /scrape/status/:jobId`

**Example:**
```bash
GET /scrape/status/123e4567-e89b-12d3-a456-426614174000
```

**Success Response (200):**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "in_progress",
  "progress": {
    "companiesScraped": 45,
    "totalCompanies": 100,
    "pagesProcessed": 3,
    "errors": 2
  },
  "startedAt": "2025-10-06T10:30:00.000Z",
  "completedAt": null,
  "errorCount": 2
}
```

**Status Values:**
- `pending`: Job queued, not started
- `in_progress`: Currently scraping
- `paused`: Job paused by user
- `completed`: Successfully completed
- `completed_with_errors`: Completed with some errors
- `failed`: Job failed
- `stopped`: Manually stopped by user

---

### 3. Get Job Results

Download scraping results in JSON or CSV format.

**Endpoint:** `GET /scrape/results/:jobId?format=json`

**Query Parameters:**
- `format`: `json` or `csv` (default: json)

**Example:**
```bash
GET /scrape/results/123e4567-e89b-12d3-a456-426614174000?format=csv
```

**Success Response (200) - JSON:**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "results": [
    {
      "name": "Company Name",
      "location": "Tokyo, Japan",
      "revenue": "$1M-5M",
      "profileUrl": "https://www.dnb.com/...",
      "doingBusinessAs": "DBA Name",
      "keyPrincipal": "John Doe",
      "principalTitle": "CEO",
      "industries": ["Information Technology"],
      "fullAddress": "123 Main St, Tokyo",
      "phone": "+81-3-1234-5678",
      "website": "https://example.com",
      "scrapedAt": "2025-10-06T10:35:22.000Z"
    }
  ],
  "totalCount": 95,
  "errors": []
}
```

**CSV Format:**
Downloads file with columns: Company Name, Location, Revenue, DBA, Key Principal, Principal Title, Industries, Full Address, Phone, Website, Profile URL

---

### 4. Pause Scraping Job

Pause an in-progress scraping job.

**Endpoint:** `POST /scrape/pause/:jobId`

**Success Response (200):**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Scraping job paused",
  "status": "paused"
}
```

**Error Responses:**
- `400`: Job is not in progress
- `404`: Job not found

---

### 5. Resume Scraping Job

Resume a paused scraping job.

**Endpoint:** `POST /scrape/resume/:jobId`

**Success Response (200):**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Scraping job resumed",
  "status": "in_progress"
}
```

**Error Responses:**
- `400`: Job is not paused
- `404`: Job not found

---

### 6. Stop Scraping Job

Stop a scraping job permanently.

**Endpoint:** `POST /scrape/stop/:jobId`

**Success Response (200):**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Scraping job stopped",
  "status": "stopped"
}
```

---

### 7. Get All Jobs

Get a list of all scraping jobs (limited to 50 most recent).

**Endpoint:** `GET /scrape/jobs`

**Success Response (200):**
```json
[
  {
    "jobId": "123e4567-e89b-12d3-a456-426614174000",
    "url": "https://www.dnb.com/...",
    "status": "completed",
    "progress": {
      "companiesScraped": 95,
      "totalCompanies": 95,
      "pagesProcessed": 5,
      "errors": 0
    },
    "startedAt": "2025-10-06T10:30:00.000Z",
    "completedAt": "2025-10-06T10:45:00.000Z",
    "createdAt": "2025-10-06T10:30:00.000Z"
  }
]
```

---

### 8. Delete Job

Delete a scraping job and its results.

**Endpoint:** `DELETE /scrape/job/:jobId`

**Success Response (200):**
```json
{
  "message": "Job deleted successfully"
}
```

---

## WebSocket Events

Connect to WebSocket for real-time updates:

```javascript
const socket = io('http://185.202.236.231:5000');

socket.on('scrapeProgress', (data) => {
  console.log('Progress:', data);
});

socket.on('scrapeComplete', (data) => {
  console.log('Completed:', data);
});

socket.on('captchaDetected', (data) => {
  console.error('CAPTCHA detected:', data);
});
```

### Event: `scrapeProgress`
```json
{
  "status": "scraping_company",
  "companyName": "Example Corp",
  "progress": 45,
  "total": 100
}
```

### Event: `scrapeComplete`
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "resultCount": 95,
  "errorCount": 0
}
```

### Event: `captchaDetected`
```json
{
  "url": "https://www.dnb.com/...",
  "type": "iframe[src*=\"recaptcha\"]",
  "timestamp": "2025-10-06T10:35:00.000Z"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing API key |
| 403 | Forbidden - Invalid API key or robots.txt disallows |
| 404 | Not Found - Job doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP
- **Headers:**
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

---

## Security

- All API keys are hashed using SHA-256
- Keep your API key secure and never commit it to version control
- Use HTTPS in production (configure SSL on VPS)
- API keys can be rotated in `.env` file

---

## Example Usage

### Python
```python
import requests

headers = {'X-API-Key': 'your-api-key'}
data = {
    'url': 'https://www.dnb.com/business-directory/...',
    'expectedCount': 50,
    'options': {'maxPages': 5}
}

response = requests.post(
    'http://185.202.236.231:5000/api/scrape/start',
    json=data,
    headers=headers
)

job = response.json()
print(f"Job started: {job['jobId']}")
```

### Node.js
```javascript
const axios = require('axios');

const config = {
  headers: { 'X-API-Key': 'your-api-key' }
};

const data = {
  url: 'https://www.dnb.com/business-directory/...',
  expectedCount: 50,
  options: { maxPages: 5 }
};

axios.post('http://185.202.236.231:5000/api/scrape/start', data, config)
  .then(res => console.log('Job started:', res.data.jobId))
  .catch(err => console.error('Error:', err.message));
```

### cURL
```bash
curl -X POST http://185.202.236.231:5000/api/scrape/start \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.dnb.com/business-directory/...",
    "expectedCount": 50,
    "options": {"maxPages": 5}
  }'
```
