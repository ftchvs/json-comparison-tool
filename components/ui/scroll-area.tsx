import React, { ReactNode } from 'react';

interface ScrollAreaProps {
  className?: string;
  children: ReactNode;
}

const ScrollArea: React.FC<ScrollAreaProps> = ({ className, children }) => {
  return (
    <div className={`overflow-auto ${className || ''}`} style={{ scrollbarWidth: 'thin' }}>
      {children}
    </div>
  );
};

export { ScrollArea };