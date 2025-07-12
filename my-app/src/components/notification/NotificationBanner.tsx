import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export default function NotificationBanner() {
  const { notifications, adminMessages, removeNotification } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <>
      {/* Admin Messages */}
      {adminMessages.map((message) => (
        <div
          key={message.id}
          className="bg-primary-600 text-white px-4 py-3"
        >
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Info className="w-5 h-5" />
              <div>
                <p className="font-medium">{message.title}</p>
                <p className="text-sm opacity-90">{message.content}</p>
              </div>
            </div>
            <span className="text-xs opacity-75">
              {new Date(message.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}

      {/* Regular Notifications */}
      <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`
              ${getBackgroundColor(notification.type)}
              border rounded-lg p-4 shadow-lg animate-slide-up
            `}
          >
            <div className="flex items-start space-x-3">
              {getIcon(notification.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {notification.title}
                </p>
                <p className="text-sm text-gray-600">
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}