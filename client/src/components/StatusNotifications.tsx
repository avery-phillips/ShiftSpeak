import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface StatusNotificationsProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  className?: string;
}

export function StatusNotifications({
  notifications,
  onDismiss,
  className,
}: StatusNotificationsProps) {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5" />;
      case 'info':
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getColorClasses = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div className={cn("fixed top-4 right-4 space-y-2 z-50", className)}>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          icon={getIcon(notification.type)}
          colorClasses={getColorClasses(notification.type)}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  icon: React.ReactNode;
  colorClasses: string;
}

function NotificationItem({
  notification,
  onDismiss,
  icon,
  colorClasses,
}: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    
    // Auto-dismiss after duration
    if (notification.duration && notification.duration > 0) {
      const dismissTimer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(dismissTimer);
      };
    }
    
    return () => clearTimeout(timer);
  }, [notification.duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300); // Match transition duration
  };

  return (
    <div
      className={cn(
        "flex items-start space-x-3 p-4 rounded-lg shadow-lg min-w-80 max-w-md",
        "transform transition-all duration-300 ease-in-out",
        isVisible 
          ? "translate-x-0 opacity-100" 
          : "translate-x-full opacity-0",
        colorClasses
      )}
    >
      <div className="flex-shrink-0">
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">
          {notification.title}
        </div>
        {notification.description && (
          <div className="text-sm opacity-90 mt-1">
            {notification.description}
          </div>
        )}
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className="text-sm underline mt-2 hover:no-underline"
          >
            {notification.action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000, // Default 5 seconds
    };
    
    setNotifications(prev => [...prev, newNotification]);
    return id;
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAll,
  };
}
