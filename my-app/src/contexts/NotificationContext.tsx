import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
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
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Initialize WebSocket connection for real-time notifications
      const ws = new WebSocket(ws://localhost:3001);
      
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', userId: user.id }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'notification') {
            addNotification({
              type: data.notificationType || 'info',
              title: data.title,
              message: data.message
            });
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      // Fetch admin messages
      fetchAdminMessages();

      return () => {
        ws.close();
      };
    }
  }, [user]);

  const fetchAdminMessages = async () => {
    try {
      const response = await fetch('/api/admin/messages', {
        headers: {
          'Authorization': Bearer ${localStorage.getItem('token')}
        }
      });
      
      if (response.ok) {
        const messages = await response.json();
        setAdminMessages(messages);
      }
    } catch (error) {
      console.error('Failed to fetch admin messages:', error);
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const value = {
    notifications,
    adminMessages,
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