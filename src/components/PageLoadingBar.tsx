import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const PageLoadingBar: React.FC = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(30);

    const timer1 = setTimeout(() => {
      setProgress(75);
    }, 150);

    const timer2 = setTimeout(() => {
      setProgress(100);
    }, 350);

    const timer3 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location.pathname, location.search]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] h-1 bg-transparent overflow-hidden pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-orange-500 via-emerald-500 to-green-600 shadow-md shadow-emerald-500/50 transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
