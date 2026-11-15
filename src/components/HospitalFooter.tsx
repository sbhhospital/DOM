import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';

export const HospitalFooter: React.FC = () => {
  return (
    <footer
      id="hospital-fixed-footer"
      className="fixed bottom-0 left-0 right-0 w-full py-0.5 md:py-1 z-[2000] overflow-hidden shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.3)] select-none border-t border-white/10"
      style={{ background: 'linear-gradient(to right, #f59e0b, #10b981, #2e7d32)' }}
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-white/5"></div>
      <div className="max-w-full mx-auto px-4 md:px-10 relative z-10">
        {/* 📱 MOBILE WEB VIEW */}
        <div className="flex flex-col items-center justify-center md:hidden py-0.5">
          <a
            href="https://www.sbhhospital.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 no-underline text-white"
          >
            <ShieldCheck size={10} className="text-white" />
            <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
              SBH Group Of Hospitals
            </span>
          </a>
          <a
            href="https://www.linkedin.com/in/ignamanmishra/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 no-underline mt-0.5 opacity-90 hover:opacity-100 text-white"
          >
            <span className="text-[7.5px] font-bold text-white uppercase tracking-widest italic leading-none">
              Architected by{' '}
              <span className="ml-1 text-[8.5px] font-black text-white uppercase tracking-widest not-italic">
                Naman Mishra
              </span>
            </span>
            <span className="bg-white rounded-[2px] p-[1px] flex items-center justify-center">
              <svg className="w-2 h-2 fill-[#0077b5]" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28" />
              </svg>
            </span>
          </a>
        </div>

        {/* 💻 DESKTOP WEB VIEW */}
        <div className="hidden md:flex items-center justify-between gap-6 h-6 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-5.5 h-5.5 rounded-md bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-md shadow-sm">
              <Activity size={11} className="text-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
                SBH INTEL
              </span>
              <span className="text-[7px] font-extrabold text-white/80 tracking-wider mt-0.5">
                SYSTEM OPERATIONAL
              </span>
            </div>
          </div>

          <a
            href="https://www.sbhhospital.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 py-0.5 px-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 backdrop-blur-lg transition-all transform hover:scale-105 group no-underline shadow-sm text-white"
          >
            <ShieldCheck size={10} className="text-white" />
            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-1 leading-none">
              SBH Group Of Hospitals
            </span>
          </a>

          <a
            href="https://www.linkedin.com/in/ignamanmishra/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col text-right group no-underline hover:opacity-90 text-white"
          >
            <span className="text-[7px] font-bold text-white/80 uppercase tracking-widest italic leading-none mb-0.5">
              Architected by
            </span>
            <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center justify-end gap-1 leading-none text-white">
              Naman Mishra
              <span className="bg-white rounded-[2px] p-[1px] flex items-center justify-center ml-1">
                <svg className="w-2 h-2 fill-[#0077b5]" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28" />
                </svg>
              </span>
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default HospitalFooter;
