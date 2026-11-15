import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  QrCode,
  Printer,
  X,
  Download,
  ShieldCheck,
  MapPin,
  Clock,
  FileText,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import sbhLogo from '../assets/sbh-logo.png';

interface BoardroomQrPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
}

export const BoardroomQrPosterModal: React.FC<BoardroomQrPosterModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
}) => {
  const posterRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFitToScreen, setIsFitToScreen] = useState(true);

  if (!isOpen) return null;

  // Real production Vercel deployment URL
  const targetCheckInUrl = 'https://sbhdom.vercel.app/boardroom-checkin';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&margin=1&color=0f172a&bgcolor=ffffff&data=${encodeURIComponent(
    targetCheckInUrl
  )}`;

  // Isolated 1-Page A4 Print (Never prints background dashboard or extra pages)
  const handlePrint = () => {
    const poster = document.getElementById('sbh-boardroom-a4-poster');
    if (!poster) return;

    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    let stylesHtml = '';
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      stylesHtml += node.outerHTML;
    });

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SBH Hospital DOM Boardroom QR Poster - A4</title>
          ${stylesHtml}
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #sbh-boardroom-a4-poster {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 16px 20px !important;
              box-shadow: none !important;
              border: 1px solid #cbd5e1 !important;
              border-radius: 12px !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
              height: auto !important;
              box-sizing: border-box !important;
            }
          </style>
        </head>
        <body>
          ${poster.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(printIframe);
        } catch (e) {
          console.warn('Iframe cleanup note:', e);
        }
      }, 1200);
    }, 450);
  };

  // Download High-Resolution A4 PNG
  const handleDownloadPng = async () => {
    const poster = document.getElementById('sbh-boardroom-a4-poster');
    if (!poster) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(poster, {
        scale: 2.5, // High-res 300DPI equivalent
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `SBH-DOM-Boardroom-QR-A4-${selectedDate || 'Poster'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Poster image download error:', err);
      alert('Could not download image. Please try the Print A4 option and choose "Save as PDF".');
    } finally {
      setIsDownloading(false);
    }
  };

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetCheckInUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-700 flex flex-col max-h-[96vh]">
        {/* Top Control Bar */}
        <div className="p-3.5 sm:px-6 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                  Boardroom Attendance QR Poster (1-Page A4)
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ExternalLink className="w-2.5 h-2.5" /> sbhdom.vercel.app
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official single-page A4 format designed for 5th Floor Conference Hall wall display
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* View Mode Toggle */}
            <button
              onClick={() => setIsFitToScreen(!isFitToScreen)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
              title={isFitToScreen ? 'Switch to 100% Size View' : 'Fit Entire Poster to Screen'}
            >
              {isFitToScreen ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isFitToScreen ? 'Full Size' : 'Fit Screen'}</span>
            </button>

            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Copy Check-In Link"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isCopied ? 'Copied!' : 'Copy URL'}</span>
            </button>

            {/* Download PNG Button */}
            <button
              onClick={handleDownloadPng}
              disabled={isDownloading}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isDownloading ? 'Exporting...' : 'Download PNG'}</span>
            </button>

            {/* Print A4 Button (1-Page Isolated) */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 (1 Page)</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Poster Preview Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/70 flex items-center justify-center">
          {/* Exact A4 Ratio Poster Container */}
          <div
            ref={posterRef}
            id="sbh-boardroom-a4-poster"
            className={`w-full max-w-[700px] bg-white rounded-2xl shadow-2xl border border-slate-300 p-6 sm:p-8 text-slate-800 relative overflow-hidden transition-all duration-200 ${
              isFitToScreen ? 'max-h-[82vh] overflow-y-auto custom-scrollbar' : ''
            }`}
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {/* Top Tricolor Accent Bar */}
            <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-emerald-500 to-green-700 rounded-full mb-4" />

            {/* Header: Hospital Logo & Title */}
            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-200">
              <img
                src={sbhLogo}
                alt="SBH Group of Hospitals"
                className="h-12 sm:h-14 w-auto object-contain mb-2 drop-shadow-xs"
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Clinical Governance & Operations Command
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                DAILY OPERATIONS STANDUP (DOM)
              </h1>
              <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mt-0.5">
                Official Boardroom Attendance Check-In Terminal
              </p>
            </div>

            {/* Session Detail Badges */}
            <div className="grid grid-cols-3 gap-2.5 my-4 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-orange-600" /> Venue
                </div>
                <div className="text-xs font-black text-slate-900 mt-0.5">Conference Room, 5th Floor</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-600" /> Cadence
                </div>
                <div className="text-xs font-black text-slate-900 mt-0.5">Daily Sharp 10:00 AM IST</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" /> Scan Window
                </div>
                <div className="text-xs font-black text-slate-900 mt-0.5">09:45 AM – 10:00 AM IST</div>
              </div>
            </div>

            {/* Central Colorful QR Frame */}
            <div className="my-3 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-gradient-to-tr from-orange-50 via-white to-emerald-50 rounded-2xl border-3 border-emerald-500 shadow-md inline-block relative">
                <div className="p-2 bg-white rounded-xl shadow-inner border border-slate-200 inline-block">
                  <img
                    src={qrCodeUrl}
                    alt="SBH Boardroom Attendance QR Code"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
                  />
                </div>
                {/* Center Badge */}
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 text-white shadow-xs">
                  <span>🔒 High-Security In-Person Audit</span>
                </div>
              </div>

              <div className="mt-2.5 space-y-0.5">
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  SCAN WITH SMARTPHONE CAMERA TO CONFIRM ATTENDANCE
                </h3>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Point your mobile phone camera or scanner at the code to access the official SBH Attendance Terminal.
                </p>
                <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 inline-block font-bold mt-1">
                  Target: {targetCheckInUrl}
                </div>
              </div>
            </div>

            {/* 3-Step Protocol */}
            <div className="grid grid-cols-3 gap-2 my-3 text-[11px]">
              <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-2">
                <div className="w-5 h-5 rounded-full bg-orange-500 text-white font-black text-[10px] flex items-center justify-center mb-1">
                  1
                </div>
                <div className="font-bold text-slate-900">Scan In Boardroom</div>
                <div className="text-[10px] text-slate-600 mt-0.5">Scan upon entering 5th Floor Hall.</div>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center mb-1">
                  2
                </div>
                <div className="font-bold text-slate-900">Verify Identity</div>
                <div className="text-[10px] text-slate-600 mt-0.5">Select your name and enter PIN.</div>
              </div>
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center mb-1">
                  3
                </div>
                <div className="font-bold text-slate-900">Single Audit Lock</div>
                <div className="text-[10px] text-slate-600 mt-0.5">Attendance counted once per day.</div>
              </div>
            </div>

            {/* Official Terms & Conditions / SOP */}
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-[10px] text-slate-600">
              <div className="font-black uppercase tracking-wider text-slate-900 flex items-center gap-1 text-[11px]">
                <FileText className="w-3 h-3 text-orange-600" />
                <span>Standing Operating Procedure (SOP) & Compliance Terms:</span>
              </div>
              <ul className="space-y-1 pl-4 list-disc marker:text-emerald-600">
                <li>
                  <strong className="text-slate-800">Punctuality Standard:</strong> Leaders attending physically must scan before 10:00 AM sharp. Late scans are audited as Late Arrival.
                </li>
                <li>
                  <strong className="text-slate-800">Single Daily Count Guarantee:</strong> Presence is recorded once per day. Rejoining preserves the initial check-in timestamp.
                </li>
                <li>
                  <strong className="text-slate-800">Automated Director Report:</strong> The DOM Register is finalized at 10:30 AM IST and transmitted directly to the Hospital Director.
                </li>
                <li>
                  <strong className="text-slate-800">Boardroom Exclusivity:</strong> This QR terminal is valid strictly for physical presence inside the 5th Floor Boardroom.
                </li>
              </ul>
            </div>

            {/* Bottom Signature Line */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <span>SBH GROUP OF HOSPITALS</span>
                <span>•</span>
                <span className="font-normal text-slate-500">Raipur Central Operations</span>
              </div>
              <div className="text-right font-medium">
                Authorized by <strong className="text-slate-800">Director Sir & Clinical Governance</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
