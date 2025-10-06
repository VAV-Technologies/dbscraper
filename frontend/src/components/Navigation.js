import React from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';

function Navigation() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          D&B Business Directory Scraper
        </Typography>
      </Toolbar>
    </AppBar>
  );
}

export default Navigation;