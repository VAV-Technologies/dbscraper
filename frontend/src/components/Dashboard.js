import React, { useState, useContext, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  LinearProgress,
  Alert,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  IconButton,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Download,
  Visibility,
  Delete,
  Refresh,
} from '@mui/icons-material';
import { SocketContext } from '../context/SocketContext';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';
const API_KEY = process.env.REACT_APP_API_KEY || '';

// Configure axios defaults
axios.defaults.headers.common['X-API-Key'] = API_KEY;

function Dashboard() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    url: 'https://www.dnb.com/business-directory/company-information.information.jp.html',
    expectedCount: 100,
    proxies: ''
  });
  const [currentJob, setCurrentJob] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [errorSnackbar, setErrorSnackbar] = useState({ open: false, message: '' });
  const [proxyValidationError, setProxyValidationError] = useState('');

  const { socket, connectionStatus, scrapeProgress, captchaAlert } = useContext(SocketContext);

  // Fetch job history
  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useQuery(
    'jobs',
    async () => {
      const response = await axios.get(`${API_BASE}/scrape/jobs`);
      return response.data;
    },
    {
      refetchInterval: false, // Disabled auto-refresh
      staleTime: Infinity,
      retry: 1,
      retryDelay: 1000,
      keepPreviousData: true,
      onError: (error) => {
        console.log('Failed to fetch jobs:', error.message);
      }
    }
  );

  // Calculate max pages based on expected count (50 companies per page)
  const calculateMaxPages = (companyCount) => {
    return Math.ceil(companyCount / 50);
  };

  // Show error popup when connection fails and user tries to interact
  useEffect(() => {
    if (connectionStatus === 'disconnected' && currentJob) {
      setErrorSnackbar({
        open: true,
        message: 'Lost connection to backend server. Real-time updates unavailable.'
      });
    }
  }, [connectionStatus, currentJob]);

  const startScraping = useMutation(
    async (data) => {
      const response = await axios.post(`${API_BASE}/scrape/start`, data);
      return response.data;
    },
    {
      onSuccess: (data) => {
        setCurrentJob(data.jobId);
      }
    }
  );

  const pauseScraping = useMutation(
    async (jobId) => {
      const response = await axios.post(`${API_BASE}/scrape/pause/${jobId}`);
      return response.data;
    }
  );

  const resumeScraping = useMutation(
    async (jobId) => {
      const response = await axios.post(`${API_BASE}/scrape/resume/${jobId}`);
      return response.data;
    }
  );

  const stopScraping = useMutation(
    async (jobId) => {
      const response = await axios.post(`${API_BASE}/scrape/stop/${jobId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        setCurrentJob(null);
      }
    }
  );

  const { data: jobStatus } = useQuery(
    ['jobStatus', currentJob],
    async () => {
      if (!currentJob) return null;
      const response = await axios.get(`${API_BASE}/scrape/status/${currentJob}`);
      return response.data;
    },
    {
      enabled: !!currentJob,
      refetchInterval: 2000
    }
  );

  const downloadResults = useMutation(
    async ({ jobId, format }) => {
      const response = await axios.get(`${API_BASE}/scrape/results/${jobId}?format=${format}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });
      
      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `dnb-results-${jobId}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        return response.data;
      }
    }
  );

  const previewResults = async () => {
    if (!currentJob) return;
    try {
      const response = await axios.get(`${API_BASE}/scrape/results/${currentJob}`);
      setPreviewData(response.data.results || []);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Failed to preview results:', error);
    }
  };

  const validateProxies = (proxyString) => {
    if (!proxyString.trim()) {
      return { valid: true, proxies: [] };
    }

    const proxyList = proxyString.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    const proxyRegex = /^(https?|socks5):\/\/([^:]+:[^@]+@)?[^:]+:\d+$/;

    const invalidProxies = proxyList.filter(proxy => !proxyRegex.test(proxy));

    if (invalidProxies.length > 0) {
      return {
        valid: false,
        error: `Invalid proxy format. Expected: http://username:password@host:port or http://host:port\nInvalid: ${invalidProxies[0]}`,
        proxies: []
      };
    }

    return { valid: true, proxies: proxyList };
  };

  const handleStart = () => {
    const expectedCount = parseInt(formData.expectedCount);
    const maxPages = calculateMaxPages(expectedCount);

    const proxyValidation = validateProxies(formData.proxies);

    if (!proxyValidation.valid) {
      setProxyValidationError(proxyValidation.error);
      return;
    }

    setProxyValidationError('');

    startScraping.mutate({
      url: formData.url,
      expectedCount: expectedCount,
      proxies: proxyValidation.proxies,
      options: {
        maxPages: maxPages,
        headless: true,
        maxConcurrency: 3
      }
    });
  };

  const handlePause = () => {
    if (currentJob) {
      pauseScraping.mutate(currentJob);
    }
  };

  const handleResume = () => {
    if (currentJob) {
      resumeScraping.mutate(currentJob);
    }
  };

  const handleStop = () => {
    if (currentJob) {
      stopScraping.mutate(currentJob);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'default';
      case 'in_progress': return 'primary';
      case 'paused': return 'warning';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'stopped': return 'warning';
      default: return 'default';
    }
  };

  const getProgressPercentage = () => {
    if (!jobStatus?.progress) return 0;
    const { companiesScraped, totalCompanies } = jobStatus.progress;
    if (totalCompanies === 0) return 0;
    return Math.min((companiesScraped / totalCompanies) * 100, 100);
  };

  const deleteJob = useMutation(
    async (jobId) => {
      await axios.delete(`${API_BASE}/scrape/job/${jobId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('jobs');
      }
    }
  );

  const handleDownloadFromHistory = async (jobId, format) => {
    try {
      const response = await axios.get(`${API_BASE}/scrape/results/${jobId}?format=${format}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `dnb-results-${jobId}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        D&B Directory Scraper
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Scraping Configuration
            </Typography>
            
            <Box component="form" noValidate sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="D&B Directory URL"
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                margin="normal"
                disabled={!!currentJob}
                helperText="Enter the D&B directory page URL to scrape"
              />
              
              <TextField
                fullWidth
                type="number"
                label="Expected Company Count"
                value={formData.expectedCount}
                onChange={(e) => setFormData({...formData, expectedCount: e.target.value})}
                margin="normal"
                disabled={!!currentJob}
                helperText={`Number of companies to scrape (≈${calculateMaxPages(formData.expectedCount)} pages at 50 companies/page)`}
              />

              <TextField
                fullWidth
                multiline
                rows={6}
                label="Proxies (One per line)"
                value={formData.proxies}
                onChange={(e) => {
                  setFormData({...formData, proxies: e.target.value});
                  setProxyValidationError('');
                }}
                margin="normal"
                disabled={!!currentJob}
                error={!!proxyValidationError}
                helperText={proxyValidationError || "Enter proxy URLs (one per line). Format: http://username:password@host:port or http://host:port\nSupports HTTP, HTTPS, and SOCKS5 proxies."}
                placeholder="http://username:password@proxy1.com:8080&#10;http://username:password@proxy2.com:8080&#10;socks5://username:password@proxy3.com:1080"
                sx={{
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }
                }}
              />

              {formData.proxies && !proxyValidationError && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {validateProxies(formData.proxies).proxies.length} proxy(ies) configured
                </Alert>
              )}

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={jobStatus?.status === 'paused' ? handleResume : handleStart}
                  disabled={(!!currentJob && jobStatus?.status !== 'paused') || startScraping.isLoading}
                  fullWidth
                >
                  {jobStatus?.status === 'paused' ? 'Resume' : 'Start'}
                </Button>

                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Pause />}
                  onClick={handlePause}
                  disabled={!currentJob || jobStatus?.status !== 'in_progress'}
                  fullWidth
                >
                  Pause
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Stop />}
                  onClick={handleStop}
                  disabled={!currentJob}
                  fullWidth
                >
                  Stop
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Real-time Status
            </Typography>
            
            {currentJob && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Job ID: {currentJob}
                </Typography>
                
                {jobStatus && (
                  <Box mb={2}>
                    <Chip 
                      label={jobStatus.status}
                      color={getStatusColor(jobStatus.status)}
                      size="small"
                    />
                  </Box>
                )}
                
                {/* Progress Bar with Counter */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">
                      {jobStatus?.progress?.companiesScraped || 0} / {jobStatus?.expectedCount || formData.expectedCount} companies
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressPercentage()}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {Math.round(getProgressPercentage())}% complete
                  </Typography>
                </Box>

                {captchaAlert && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
                    CAPTCHA Detected! URL: {captchaAlert.url?.substring(0, 50)}...
                    Type: {captchaAlert.type}
                  </Alert>
                )}

                {scrapeProgress && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {scrapeProgress.status === 'scraping_directory' &&
                      `Scraping page ${scrapeProgress.currentPage}`}
                    {scrapeProgress.status === 'scraping_company' &&
                      `Processing: ${scrapeProgress.companyName}`}
                  </Alert>
                )}

                {jobStatus?.progress && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Pages Processed: {jobStatus.progress.pagesProcessed || 0}
                    </Typography>
                    {jobStatus.progress.errors > 0 && (
                      <Typography variant="body2" color="error">
                        Errors: {jobStatus.progress.errors}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Download Section */}
                <Paper
                  sx={{
                    p: 2,
                    mt: 3,
                    backgroundColor: jobStatus?.status === 'completed' ? '#e8f5e9' : '#f5f5f5',
                    border: jobStatus?.status === 'completed' ? '2px solid #4caf50' : '1px solid #ddd'
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    📥 Download Results
                  </Typography>

                  {jobStatus?.status === 'completed' && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      Scraping Complete! {jobStatus.progress?.companiesScraped || 0} companies scraped.
                    </Alert>
                  )}

                  {(jobStatus?.status === 'in_progress' || jobStatus?.status === 'paused') && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Download will be available when scraping completes.
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant={jobStatus?.status === 'completed' ? 'contained' : 'outlined'}
                      size="large"
                      startIcon={<Download />}
                      onClick={() => downloadResults.mutate({ jobId: currentJob, format: 'csv' })}
                      disabled={!jobStatus?.progress?.companiesScraped || jobStatus?.status === 'in_progress' || jobStatus?.status === 'paused'}
                      color="success"
                    >
                      Download CSV
                    </Button>

                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<Download />}
                      onClick={() => downloadResults.mutate({ jobId: currentJob, format: 'json' })}
                      disabled={!jobStatus?.progress?.companiesScraped || jobStatus?.status === 'in_progress' || jobStatus?.status === 'paused'}
                    >
                      Download JSON
                    </Button>

                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<Visibility />}
                      onClick={previewResults}
                      disabled={!jobStatus?.progress?.companiesScraped}
                    >
                      Preview Data
                    </Button>
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {jobStatus?.progress?.companiesScraped
                      ? `${jobStatus.progress.companiesScraped} companies ready to download`
                      : 'No data available yet'}
                  </Typography>
                </Paper>
              </Box>
            )}
            
            {!currentJob && (
              <Alert severity="info">
                Configure scraping parameters and click "Start Scraping" to begin
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Job History Section */}
      <Box sx={{ mt: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Job History
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetchJobs()}
            disabled={jobsLoading}
          >
            {jobsLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Job ID</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Completed</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs?.map((job) => (
                  <TableRow key={job.jobId}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {job.jobId.slice(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {job.url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={job.status}
                        color={getStatusColor(job.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {job.progress?.companiesScraped || 0} companies
                        {job.progress?.errors > 0 && (
                          <span style={{ color: 'red' }}> ({job.progress.errors} errors)</span>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {job.startedAt ? formatDate(job.startedAt) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {job.completedAt ? formatDate(job.completedAt) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {job.status === 'completed' && job.progress?.companiesScraped > 0 ? (
                          <Button
                            variant="contained"
                            size="small"
                            color="success"
                            startIcon={<Download />}
                            onClick={() => handleDownloadFromHistory(job.jobId, 'csv')}
                          >
                            CSV
                          </Button>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadFromHistory(job.jobId, 'csv')}
                            disabled={!job.progress?.companiesScraped}
                            title="Download CSV"
                          >
                            <Download />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => deleteJob.mutate(job.jobId)}
                          color="error"
                          title="Delete Job"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {jobsLoading && !jobs && (
          <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              Loading job history...
            </Typography>
          </Paper>
        )}

        {!jobsLoading && (!jobs || jobs.length === 0) && (
          <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              No scraping jobs found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Start your first scraping job above
            </Typography>
          </Paper>
        )}
      </Box>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Scraped Data Preview ({previewData.length} companies)
        </DialogTitle>
        <DialogContent>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Company Name</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Revenue</TableCell>
                  <TableCell>Key Principal</TableCell>
                  <TableCell>Website</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.slice(0, 50).map((company, index) => (
                  <TableRow key={index}>
                    <TableCell>{company.name}</TableCell>
                    <TableCell>{company.location}</TableCell>
                    <TableCell>{company.revenue}</TableCell>
                    <TableCell>{company.keyPrincipal}</TableCell>
                    <TableCell>
                      {company.website && (
                        <a href={company.website} target="_blank" rel="noopener noreferrer">
                          {company.website}
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={errorSnackbar.open}
        autoHideDuration={6000}
        onClose={() => setErrorSnackbar({ ...errorSnackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setErrorSnackbar({ ...errorSnackbar, open: false })}
          severity="error"
          sx={{ width: '100%' }}
        >
          {errorSnackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default Dashboard;