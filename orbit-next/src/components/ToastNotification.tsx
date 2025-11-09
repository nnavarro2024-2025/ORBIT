import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";

interface ToastNotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

export default function ToastNotification({ type, title, message, onClose }: ToastNotificationProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-secondary text-white';
      case 'error':
        return 'bg-destructive text-white';
      case 'warning':
        return 'bg-warning text-white';
      case 'info':
        return 'bg-primary text-white';
      default:
        return 'bg-primary text-white';
    }
  };

  return (
    <div className={`material-card p-4 max-w-sm ${getStyles()} animate-in slide-in-from-right`}>
      <div className="flex items-center">
        {getIcon()}
        <div className="ml-3">
          <div className="font-medium">{title}</div>
          <div className="text-sm opacity-90">{message}</div>
        </div>
        <button
          onClick={onClose}
          className="ml-auto text-white/80 hover:text-white"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
