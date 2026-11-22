import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, ShieldAlert, RefreshCw } from 'lucide-react';

interface ErrorPageProps {
  code?: 404 | 403 | 500 | 501;
  customTitle?: string;
  customMessage?: string;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ code = 404, customTitle, customMessage }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine error code from URL path if passed via route (e.g., /403, /500, /501)
  let resolvedCode = code;
  if (location.pathname === '/403') resolvedCode = 403;
  else if (location.pathname === '/500') resolvedCode = 500;
  else if (location.pathname === '/501') resolvedCode = 501;

  const errorConfig = {
    404: {
      image: '/images/error/404.png',
      badge: '404 NOT FOUND',
      title: customTitle || 'Oops! This Page is Not Found',
      subtitle: customMessage || 'The requested page does not exist or may have been relocated.',
    },
    403: {
      image: '/images/error/01.png',
      badge: '403 ACCESS RESTRICTED',
      title: customTitle || 'Access Restricted / Forbidden',
      subtitle: customMessage || 'You do not have the required security credentials to access this protected sector.',
    },
    500: {
      image: '/images/error/500.png',
      badge: '500 INTERNAL SYSTEM ERROR',
      title: customTitle || 'Internal System Error',
      subtitle: customMessage || 'An unexpected anomaly occurred while processing your request. Operations data is secure.',
    },
    501: {
      image: '/images/error/02.png',
      badge: '501 SERVICE MAINTENANCE',
      title: customTitle || 'Service Maintenance & Update',
      subtitle: customMessage || 'This hospital operations endpoint is temporarily offline for scheduled system optimization.',
    },
  }[resolvedCode];

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white select-none px-4 py-12">
      {/* Hope UI Style Concentric Animated Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-30">
        <div className="w-[850px] h-[850px] rounded-full border border-indigo-400/20 flex items-center justify-center animate-pulse">
          <div className="w-[700px] h-[700px] rounded-full border border-purple-400/25 flex items-center justify-center">
            <div className="w-[550px] h-[550px] rounded-full border border-indigo-400/30 flex items-center justify-center">
              <div className="w-[400px] h-[400px] rounded-full border border-purple-400/35 flex items-center justify-center">
                <div className="w-[260px] h-[260px] rounded-full bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 blur-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="relative z-10 max-w-xl w-full text-center flex flex-col items-center">
        {/* Error Illustration from Demo assets */}
        <div className="relative mb-6 max-w-[320px] sm:max-w-[400px] drop-shadow-2xl">
          <img
            src={errorConfig.image}
            alt={`Error ${resolvedCode}`}
            className="w-full h-auto object-contain transition-transform duration-500 hover:scale-105"
            onError={(e) => {
              // Fallback to 404 if specific error image fails to load
              (e.currentTarget as HTMLImageElement).src = '/images/error/404.png';
            }}
          />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wider mb-3 backdrop-blur-md">
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
          <span>{errorConfig.badge}</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md mb-2">
          {errorConfig.title}
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto leading-relaxed mb-8">
          {errorConfig.subtitle}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/boardroom-checkin')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leader Check-In</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-sm backdrop-blur-md transition-all cursor-pointer"
            title="Reload Page"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom subtle copyright / branding note */}
        <div className="mt-12 text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <span>SBH GROUP OF HOSPITALS</span>
          <span>•</span>
          <span>DOM OPERATIONS COMMAND</span>
        </div>
      </div>
    </div>
  );
};
