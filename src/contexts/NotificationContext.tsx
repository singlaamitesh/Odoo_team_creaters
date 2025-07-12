import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  details?: any;
  timestamp: Date;
}

interface AdminMessage {
  id: number;
  title: string;
  content: string;
  type: 'announcement' | 'maintenance' | 'update';
  created_at: string;
  admin_name: string;
}

interface NotificationContextType {
  notifications: Notification[];
  adminMessages: AdminMessage[];
  wsConnected: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const { user } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef<number | null>(null);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const fetchAdminMessages = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await fetch('/api/admin/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAdminMessages(data);
      } else if (response.status === 403) {
        // User is not admin, which is fine - just don't show admin messages
        console.log('User is not an admin, admin messages will not be shown');
      } else {
        console.error('Failed to fetch admin messages:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching admin messages:', error);
    }
  }, []);

  const setupWebSocket = useCallback(() => {
    if (!user?.id) return;
    
    // Close existing connection if any
    if (ws.current) {
      // Only close if not already closing or closed
      if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.close(1000, 'Reconnecting...');
      }
      ws.current = null;
    }
    
    // Clear any existing reconnect timeout
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeout.current) {
      window.clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    const token = localStorage.getItem('token');
    const wsUrl = `ws://localhost:3001/ws?userId=${user.id}${token ? `&token=${token}` : ''}`;
    
    try {
      ws.current = new WebSocket(wsUrl);
      
      // Connection opened
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
        setWsConnected(true);
      };

      // Listen for messages
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'notification') {
            addNotification({
              type: data.notificationType || 'info',
              title: data.title,
              message: data.message,
              details: data.details
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      // Handle errors
      ws.current.onerror = (event: Event) => {
        console.error('WebSocket error:', event);
        setWsConnected(false);
      };

      // Handle connection close
      ws.current.onclose = (event: CloseEvent) => {
        console.log(`WebSocket closed with code ${event.code}: ${event.reason}`);
        setWsConnected(false);
        
        // Don't attempt to reconnect if it was a normal closure or unauthorized
        if (event.code === 1000 || event.code === 4000) {
          console.log('WebSocket closed normally, not reconnecting');
          return;
        }
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          
          console.log(`Attempting to reconnect in ${delay}ms... (Attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeout.current = window.setTimeout(() => {
            setupWebSocket();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached. Please refresh the page to try again.');
        }
      };
      
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      // Schedule a reconnection attempt
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current <= maxReconnectAttempts) {
        console.log(`Failed to connect. Retrying in ${delay}ms... (Attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
        reconnectTimeout.current = window.setTimeout(setupWebSocket, delay);
      }
    }
  }, [user?.id, addNotification]);

  // Set up WebSocket connection when user is available
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (user?.id && token) {
      setupWebSocket();
      fetchAdminMessages();
      
      // Set up interval to check connection and reconnect if needed
      const connectionCheckInterval = setInterval(() => {
        if (ws.current && (ws.current.readyState === WebSocket.CLOSED || ws.current.readyState === WebSocket.CLOSING)) {
          console.log('WebSocket connection lost, attempting to reconnect...');
          setupWebSocket();
        }
      }, 10000); // Check every 10 seconds
      
      // Cleanup function
      return () => {
        clearInterval(connectionCheckInterval);
        if (ws.current) {
          ws.current.close(1000, 'Component unmounting');
          ws.current = null;
        }
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      };
    }

    return () => {
      // Clean up WebSocket connection on unmount
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        window.clearTimeout(reconnectTimeout.current);
      }
    };
  }, [user?.id, setupWebSocket, fetchAdminMessages]);

  const value = {
    notifications,
    adminMessages,
    wsConnected,
    addNotification,
    removeNotification,
    clearNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
