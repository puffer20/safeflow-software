import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// --- INTERFACES ---
interface WebsiteStats {
  id: string;
  name: string;
  requests: number;
  errorRate: number;
  latency: number;
  status: 'idle' | 'active' | 'warning' | 'critical';
  threatLevel: 'idle' | 'low' | 'moderate' | 'high';
  lastAction: string;
  sourceIP?: string; // We added this for the IP Blocker
}

interface Alert {
  id: number;
  website: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  action: string;
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  websiteStats: WebsiteStats[];
  alerts: Alert[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  websiteStats: [],
  alerts: [],
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [websiteStats, setWebsiteStats] = useState<WebsiteStats[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // 1. Connect to Backend
    const newSocket = io('http://localhost:3001');

    newSocket.on('connect', () => {
      console.log('✅ Socket Connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket Disconnected');
      setIsConnected(false);
    });

    // 2. LISTEN: Initial Data Load
    newSocket.on('init-stats', (data: WebsiteStats[]) => {
      setWebsiteStats(data);
    });

    // 3. LISTEN: Live Updates (Traffic)
    newSocket.on('website-update', (updatedSite: WebsiteStats) => {
      setWebsiteStats((prev) => {
        const index = prev.findIndex((site) => site.id === updatedSite.id);
        if (index > -1) {
          // Update existing card
          const newStats = [...prev];
          newStats[index] = updatedSite;
          return newStats;
        } else {
          // Add new card (Dynamic Add)
          return [...prev, updatedSite];
        }
      });
    });

    // 4. LISTEN: Website Deleted (THIS FIXES YOUR ISSUE)
    newSocket.on('website-removed', (removedId: string) => {
      // Instantly filter out the deleted ID from the list
      setWebsiteStats((prev) => prev.filter((site) => site.id !== removedId));
    });

    // 5. LISTEN: Security Alerts
    newSocket.on('new-alert', (alert: Alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50)); // Keep last 50
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, websiteStats, alerts }}>
      {children}
    </SocketContext.Provider>
  );
};