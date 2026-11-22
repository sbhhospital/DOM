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
    setProgress(20);

    const timer1 = setTimeout(() => {
      setProgress(55);
    }, 250);

    const timer2 = setTimeout(() => {
      setProgress(85);
    }, 600);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setShowSpinner(false);
    }, 1000);

    const timer4 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 1250);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [location.pathname, location.search]);

  if (!visible) return null;

  return (
    <>
      {/* Top Hope UI Slim Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[99999] h-1.5 bg-transparent overflow-hidden pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-[#7065f0] via-[#8577ff] to-[#3bb7b8] shadow-md shadow-indigo-500/50 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Full-Featured Prominent 1-Second Page Transition Loader (Hope UI / Executive) */}
      {showSpinner && (
        <div className="fixed inset-0 z-[99998] pointer-events-none flex items-center justify-center bg-slate-900/30 backdrop-blur-[4px] transition-all duration-300 animate-in fade-in">
          <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white shadow-2xl border-2 border-indigo-100 max-w-sm w-full mx-4 text-center transform scale-100 animate-in zoom-in-95 duration-200">
            {/* Hope UI Animated Loader Graphic */}
            <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 border-t-[#7065f0] animate-spin" />
              <img
                src="/images/loader.gif"
                alt="SBH Loader"
                className="w-16 h-16 object-contain drop-shadow-md"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Title & Brand */}
            <div className="text-sm font-black text-slate-900 tracking-tight uppercase mb-1">
              SBH Operations Command
            </div>
            <div className="text-xs font-semibold text-[#7065f0] mb-3">
              Daily Attendance Register
            </div>

            {/* Smooth Progress Meter */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2">
              <div
                className="bg-gradient-to-r from-[#7065f0] to-[#3bb7b8] h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-600">
              Loading Data... {progress}%
            </span>
          </div>
        </div>
      )}
    </>
  );
};
