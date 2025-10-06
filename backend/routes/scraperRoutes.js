const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const { authenticateApiKey } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateApiKey);

router.post('/start', scraperController.startScraping);
router.get('/status/:jobId', scraperController.getStatus);
router.get('/results/:jobId', scraperController.getResults);
router.post('/pause/:jobId', scraperController.pauseScraping);
router.post('/resume/:jobId', scraperController.resumeScraping);
router.post('/stop/:jobId', scraperController.stopScraping);
router.get('/jobs', scraperController.getAllJobs);
router.delete('/job/:jobId', scraperController.deleteJob);

module.exports = router;