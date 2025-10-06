import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from 'react-query';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import { SocketProvider } from './context/SocketContext';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SocketProvider>
          <Router>
            <Navigation />
            <Routes>
              <Route path="/" element={<Dashboard />} />
            </Routes>
          </Router>
        </SocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;