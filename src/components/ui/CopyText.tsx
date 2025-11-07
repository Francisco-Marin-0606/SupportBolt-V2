import { useEffect, useState } from 'react';

interface CopyTextProps {
  text: string;
  className?: string;
  iconClassName?: string;
  color?: string;
  messageClassName?: string;
}

export default function CopyText({ 
  text, 
  className = "text-lg cursor-pointer flex items-center gap-2",
  iconClassName,
  color = "text-black",
}: CopyTextProps) {
  const [iconColor, setIconColor] = useState<string | null>(null);
  const finalIconClassName = `${iconClassName} w-[15px] h-[15px]`;
  
  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text)
      .then(() => {
        setIconColor('text-[#0066ff]');
      })
      .catch(err => {
        console.error('Error copiando al portapapeles:', err);
        setIconColor('text-red-500');
      });

    // Limpiar el mensaje después de 2 segundos
    setTimeout(() => {
      setIconColor(color);
    }, 2000);
  };

  useEffect(() => {
    setIconColor(color);
  }, [color]);

  return (
    <div className="" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={copyToClipboard}
        className={`${iconColor} ${className}`}>
        {text}
        <svg 
          className={`${iconColor} ${finalIconClassName}`} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    </div>
  );
} 