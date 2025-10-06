import React, { createContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [scrapeProgress, setScrapeProgress] = useState(null);
  const [captchaAlert, setCaptchaAlert] = useState(null);

  useEffect(() => {
    const socketInstance = io(process.env.REACT_APP_API_BASE || 'http://localhost:5000', {
      transports: ['websocket']
    });

    socketInstance.on('connect', () => {
      setConnectionStatus('connected');
    });

    socketInstance.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socketInstance.on('scrapeProgress', (data) => {
      setScrapeProgress(data);
    });

    socketInstance.on('scrapeComplete', (data) => {
      setScrapeProgress(null);
      console.log('Scraping completed:', data);
    });

    socketInstance.on('captchaDetected', (data) => {
      setCaptchaAlert(data);
      console.error('CAPTCHA detected:', data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{
      socket,
      connectionStatus,
      scrapeProgress,
      captchaAlert
    }}>
      {children}
    </SocketContext.Provider>
  );
};