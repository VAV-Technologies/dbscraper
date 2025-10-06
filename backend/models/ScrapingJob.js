const mongoose = require('mongoose');

const scrapingJobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  expectedCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'paused', 'completed', 'failed', 'stopped'],
    default: 'pending'
  },
  progress: {
    companiesScraped: { type: Number, default: 0 },
    totalCompanies: { type: Number, default: 0 },
    pagesProcessed: { type: Number, default: 0 },
    errors: { type: Number, default: 0 }
  },
  // Results now stored in separate CompanyResult collection
  // This allows unlimited company records without hitting 16MB document limit
  errors: [{
    page: Number,
    error: String,
    url: String,
    timestamp: Date
  }],
  startedAt: Date,
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

scrapingJobSchema.index({ status: 1, createdAt: -1 });
scrapingJobSchema.index({ jobId: 1, status: 1 });

module.exports = mongoose.model('ScrapingJob', scrapingJobSchema);