const mongoose = require('mongoose');

const companyResultSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    index: true  // Critical for querying by job
  },
  name: {
    type: String,
    required: true,
    index: true  // For searching companies
  },
  location: String,
  revenue: String,
  profileUrl: String,
  doingBusinessAs: String,
  keyPrincipal: String,
  principalTitle: String,
  industries: [String],
  fullAddress: String,
  phone: String,
  website: String,
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient job-based queries
companyResultSchema.index({ jobId: 1, createdAt: 1 });
companyResultSchema.index({ jobId: 1, name: 1 });

// For analytics and reporting
companyResultSchema.index({ location: 1 });
companyResultSchema.index({ scrapedAt: -1 });

module.exports = mongoose.model('CompanyResult', companyResultSchema);
