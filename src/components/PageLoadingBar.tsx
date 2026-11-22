import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const PageLoadingBar: React.FC = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    setVisible(true);
    setShowSpinner(true);
    setProgress(35);

    const timer1 = setTimeout(() => {
      setProgress(80);
    }, 120);

    const timer2 = setTimeout(() => {
      setProgress(100);
      setShowSpinner(false);
    }, 280);

    const timer3 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location.pathname, location.search]);

  if (!visible) return null;

  return (
    <>
      {/* Top Hope UI Slim Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[99999] h-1 bg-transparent overflow-hidden pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 shadow-md shadow-indigo-500/50 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Snappy Translucent Center Loader Overlay (Hope UI Style) */}
      {showSpinner && (
        <div className="fixed inset-0 z-[99998] pointer-events-none flex items-center justify-center bg-slate-950/15 backdrop-blur-[1.5px] transition-opacity duration-200">
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 shadow-2xl border border-slate-200/80 dark:border-slate-800 scale-95 animate-in fade-in zoom-in-95 duration-150">
            <div className="relative w-12 h-12 flex items-center justify-center">
              {/* Hope UI Loader image with fallback animated spinner */}
              <img
                src="/images/loader.gif"
                alt="Loading"
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="mt-1 text-[11px] font-bold tracking-wide text-slate-700 dark:text-slate-200">
              Loading...
            </span>
          </div>
        </div>
      )}
    </>
  );
};
