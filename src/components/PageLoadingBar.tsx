import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const PageLoadingBar: React.FC = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);

    // Fast, responsive 360ms presentation so there is zero frustrating delay
    const timer = setTimeout(() => {
      setVisible(false);
    }, 360);

    return () => {
      clearTimeout(timer);
    };
  }, [location.pathname, location.search]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none flex flex-col items-center justify-center bg-white/80 backdrop-blur-[3px] transition-all duration-200 animate-in fade-in">
      {/* Big Animated Loader Image - Transparent Background, No White Card Box, No Percentage Meter */}
      <div className="flex flex-col items-center justify-center p-4">
        <img
          src="/images/loader.webp"
          alt="SBH Hospital Standup Loading"
          className="w-36 h-36 sm:w-48 sm:h-48 object-contain drop-shadow-2xl animate-pulse"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/images/loader.gif';
          }}
        />
      </div>
    </div>
  );
};
