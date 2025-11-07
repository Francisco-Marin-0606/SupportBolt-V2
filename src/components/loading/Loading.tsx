// src/components/loading/Loading.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  text = 'Cargando...',
  size = 'md',
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50' 
    : 'w-full';

  return (
    <div className={`${containerClasses} flex flex-col items-center justify-center min-h-[100px]`}>
      <Loader2 
        className={`${sizeClasses[size]} animate-spin text-primary`} 
      />
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600 mt-2`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default Loading;