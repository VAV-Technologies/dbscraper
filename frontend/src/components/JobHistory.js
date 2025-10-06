import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Box,
} from '@mui/material';
import { Delete, Download, Visibility } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';

function JobHistory() {
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery(
    'jobs',
    async () => {
      const response = await axios.get(`${API_BASE}/scrape/jobs`);
      return response.data;
    },
    {
      refetchInterval: 5000
    }
  );

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

  const downloadResults = async (jobId, format) => {
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'default';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'completed_with_errors': return 'warning';
      case 'failed': return 'error';
      case 'stopped': return 'secondary';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Loading job history...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Scraping Job History
      </Typography>

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
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => downloadResults(job.jobId, 'csv')}
                        disabled={!job.progress?.companiesScraped}
                        title="Download CSV"
                      >
                        <Download />
                      </IconButton>
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

      {(!jobs || jobs.length === 0) && (
        <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            No scraping jobs found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Start your first scraping job from the Dashboard
          </Typography>
        </Paper>
      )}
    </Container>
  );
}

export default JobHistory;