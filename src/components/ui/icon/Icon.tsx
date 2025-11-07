import React from 'react';
import { 
  Search,
  Eye,
  PencilLine,
  Trash2,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  CameraIcon
} from 'lucide-react';

// Tipo que representa un componente de icono
type IconComponentProps = {
  className?: string;
  size?: number;
  strokeWidth?: number;
};

type IconsMap = {
  [key: string]: React.ComponentType<IconComponentProps>;
};

const icons: IconsMap = {
  Search,
  Eye,
  PencilLine,
  Trash2,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  CameraIcon
};

export interface IconProps {
  name: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  className = '', 
  size = 16, 
  strokeWidth = 2 
}) => {
  const IconComponent = icons[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <IconComponent
      className={className}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
};

export default Icon;