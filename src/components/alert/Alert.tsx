// src/components/alert/Alert.tsx
import React from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  InfoIcon,
  X as CloseIcon 
} from 'lucide-react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
  showIcon?: boolean;
  action?: React.ReactNode;
}

const Alert: React.FC<AlertProps> & {
  Title: typeof AlertTitle;
  Description: typeof AlertDescription;
  Action: typeof AlertAction;
} = ({
  variant = 'info',
  title,
  description,
  children,
  onClose,
  className = '',
  showIcon = true,
  action
}) => {
  const variants = {
    success: {
      icon: CheckCircle2,
      className: 'bg-green-50 text-green-800 border-green-200',
      iconClassName: 'text-green-500'
    },
    error: {
      icon: XCircle,
      className: 'bg-red-50 text-red-800 border-red-200',
      iconClassName: 'text-red-500'
    },
    warning: {
      icon: AlertCircle,
      className: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      iconClassName: 'text-yellow-500'
    },
    info: {
      icon: InfoIcon,
      className: 'bg-blue-50 text-blue-800 border-blue-200',
      iconClassName: 'text-blue-500'
    }
  };

  const { icon: Icon, className: variantClassName, iconClassName } = variants[variant];

  return (
    <div
      role="alert"
      className={`relative rounded-lg border p-4 ${variantClassName} ${className}`}
    >
      <div className="flex">
        {showIcon && (
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${iconClassName}`} />
          </div>
        )}
        <div className="ml-3 w-full">
          <div className="flex justify-between">
            <div className="flex-1">
              {children || (
                <>
                  {title && <AlertTitle>{title}</AlertTitle>}
                  {description && <AlertDescription>{description}</AlertDescription>}
                </>
              )}
            </div>
            {action && <div className="ml-4 flex-shrink-0">{action}</div>}
            {onClose && (
              <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50"
                onClick={onClose}
              >
                <span className="sr-only">Cerrar</span>
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AlertTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children,
  className = ''
}) => (
  <h3 className={`font-medium ${className}`}>{children}</h3>
);

const AlertDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children,
  className = ''
}) => (
  <div className={`mt-1 text-sm opacity-90 ${className}`}>{children}</div>
);

const AlertAction: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children,
  className = ''
}) => (
  <div className={`ml-4 flex-shrink-0 ${className}`}>{children}</div>
);

Alert.Title = AlertTitle;
Alert.Description = AlertDescription;
Alert.Action = AlertAction;

export default Alert;