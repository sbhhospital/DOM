import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, ShieldCheck, RefreshCw, Smartphone, CheckCircle, Clock } from 'lucide-react';
import { useDom } from '../context/DomContext';

export const ProjectRoomQr: React.FC = () => {
  const { meeting, qrToken, qrSecondsRemaining } = useDom();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && qrToken) {
      QRCode.toCanvas(
        canvasRef.current,
        qrToken,
        {
          width: 320,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('QR rendering error', error);
        }
      );
    }
  }, [qrToken]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
          <ShieldCheck className="w-3.5 h-3.5" /> High-Security In-Room Dynamic QR
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">DOM Conference Hall Projection</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
          Project this screen onto the DOM Conference Room AV display. Physical leaders scan using their mobile camera or
          personal portal.
        </p>
      </div>

      {/* Main QR Card */}
      <div className="bg-white rounded-2xl border-2 border-slate-900/10 p-8 shadow-xl flex flex-col items-center justify-center">
        {/* Dynamic Rotation Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-mono font-semibold px-3 py-1 rounded-full shadow-xs">
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${qrSecondsRemaining < 5 ? 'animate-spin' : ''}`} />
            Auto-rotates in: <span className="text-amber-300 font-bold">{qrSecondsRemaining}s</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Anti-replay & anti-sharing enabled</span>
        </div>

        {/* QR Canvas Container with Frame */}
        <div className="p-4 bg-slate-50 rounded-2xl border-4 border-slate-800 shadow-inner relative">
          <canvas ref={canvasRef} className="rounded-lg shadow-sm" />
        </div>

        {/* Live Token Payload Indicator */}
        <div className="mt-5 text-center">
          <div className="text-[11px] font-mono text-slate-400 tracking-wider bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
            Token: {qrToken}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Active Session Window: 10:00 AM – 10:45 AM IST • SBH Boardroom 1
          </p>
        </div>
      </div>

      {/* Protocol Instructions for Leaders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            1
          </div>
          <div>
            <div className="font-bold text-slate-800">Scan In-Room QR</div>
            <div className="text-slate-500 mt-0.5">Use your mobile device camera or Personal Portal link.</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            2
          </div>
          <div>
            <div className="font-bold text-slate-800">Instant Check-in</div>
            <div className="text-slate-500 mt-0.5">System records your scan timestamp and puts you in queue.</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            3
          </div>
          <div>
            <div className="font-bold text-slate-800">Admin Visual Sign-off</div>
            <div className="text-slate-500 mt-0.5">Meeting coordinator confirms physical attendance in hall.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
