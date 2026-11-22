import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
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
  FileDown,
} from 'lucide-react';
import sbhLogo from '../assets/sbh-logo.png';
import {
  downloadBoardroomPosterPdf,
  downloadBoardroomPosterPng,
  generateBoardroomPosterPdf,
  TARGET_CHECKIN_URL,
} from '../lib/posterPdfGenerator';
import { formatToIndianDate } from '../lib/meetingUtils';

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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFitToScreen, setIsFitToScreen] = useState(true);

  // Generate instant local base64 QR code
  useEffect(() => {
    QRCode.toDataURL(TARGET_CHECKIN_URL, {
      width: 600,
      margin: 1,
      color: {
        dark: '#232d42',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, []);

  if (!isOpen) return null;

  // Direct 1-Page A4 Print with 100% visible, centered QR code via vector PDF stream
  const handlePrint = async () => {
    setIsDownloadingPdf(true);
    try {
      const doc = await generateBoardroomPosterPdf(selectedDate);
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);

      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      printIframe.src = blobUrl;
      document.body.appendChild(printIframe);

      printIframe.onload = () => {
        setTimeout(() => {
          try {
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print note, opening PDF in tab:', e);
            window.open(blobUrl, '_blank');
          }
          setTimeout(() => {
            try {
              document.body.removeChild(printIframe);
              URL.revokeObjectURL(blobUrl);
            } catch (err) {
              console.warn(err);
            }
          }, 3500);
        }, 400);
      };
    } catch (err) {
      console.error('PDF print generation error:', err);
      await handleDownloadPdf();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Download High-Resolution A4 PDF directly using jsPDF
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadBoardroomPosterPdf(selectedDate);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Could not download PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Download Ultra-Crisp PNG
  const handleDownloadPng = async () => {
    setIsDownloadingPng(true);
    try {
      await downloadBoardroomPosterPng(selectedDate);
    } catch (err) {
      console.error('PNG download error:', err);
      alert('Could not download image. Please use the Download PDF option.');
    } finally {
      setIsDownloadingPng(false);
    }
  };

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(TARGET_CHECKIN_URL);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[10000] modal-backdrop flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-[#f0f1f8] flex flex-col max-h-[96vh]">
        {/* Top Control Bar matching Hope UI */}
        <div className="p-3.5 sm:px-6 bg-white text-[#232d42] flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-[#f0f1f8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eff0fe] text-[#7065f0] border border-indigo-200/50 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5 text-[#7065f0]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-[#232d42]">
                  Boardroom Attendance QR Poster (1-Page A4)
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#eff0fe] text-[#7065f0] border border-indigo-200/60">
                  <ExternalLink className="w-2.5 h-2.5" /> sbhdom.vercel.app
                </span>
              </div>
              <p className="text-[11px] text-[#8a92a6]">
                Official single-page A4 format designed for 5th Floor Conference Hall display
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <button
              onClick={() => setIsFitToScreen(!isFitToScreen)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#f4f5fa] hover:bg-slate-200/60 text-[#232d42] border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              title={isFitToScreen ? 'Switch to 100% Size View' : 'Fit Entire Poster to Screen'}
            >
              {isFitToScreen ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isFitToScreen ? 'Full Size' : 'Fit Screen'}</span>
            </button>

            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#f4f5fa] hover:bg-slate-200/60 text-[#232d42] border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Copy Check-In Link"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isCopied ? 'Copied!' : 'Copy URL'}</span>
            </button>

            {/* Download A4 PDF Button (Primary Action) */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-1.5 bg-[#1aa053] hover:bg-[#15803d] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Download official print-ready A4 PDF for wall pasting"
            >
              {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF (Print)'}</span>
            </button>

            {/* Download PNG Button */}
            <button
              onClick={handleDownloadPng}
              disabled={isDownloadingPng}
              className="px-3 py-1.5 bg-[#7065f0] hover:bg-[#5e52e4] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              {isDownloadingPng ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isDownloadingPng ? 'Exporting...' : 'Download PNG'}</span>
            </button>

            {/* Print A4 Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-white hover:bg-[#f4f5fa] text-[#232d42] border border-slate-200 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span>Print A4</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-[#232d42] rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Poster Preview Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#f4f5fa] flex items-center justify-center">
          {/* Exact A4 Ratio Poster Container */}
          <div
            ref={posterRef}
            id="sbh-boardroom-a4-poster"
            className={`w-full max-w-[700px] bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 text-[#232d42] relative overflow-hidden transition-all duration-200 ${
              isFitToScreen ? 'max-h-[82vh] overflow-y-auto custom-scrollbar' : ''
            }`}
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {/* Top Accent Line */}
            <div className="h-2 w-full bg-gradient-to-r from-[#7065f0] via-[#5ec4c7] to-[#1aa053] rounded-full mb-4" />

            {/* Header: Hospital Logo & Title */}
            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
              <img
                src={sbhLogo}
                alt="SBH Group of Hospitals"
                className="h-12 sm:h-14 w-auto object-contain mb-2 drop-shadow-xs mx-auto"
              />
              <span className="text-[11px] font-bold text-[#7065f0] bg-[#eff0fe] border border-indigo-200/50 uppercase tracking-widest px-3 py-1 rounded-full mb-1">
                Official Operations Management Protocol
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#232d42] tracking-tight uppercase">
                DAILY OPERATIONS STANDUP (DOM)
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Physical Attendance Verification • 5th Floor Conference Hall
              </p>
            </div>

            {/* Session Info Badges */}
            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="bg-[#f4f5fa] p-3 rounded-2xl border border-slate-200/60 text-center">
                <span className="text-[10px] font-bold text-[#8a92a6] uppercase tracking-wider flex items-center justify-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#7065f0]" /> Mandatory Venue
                </span>
                <span className="text-xs font-bold text-[#232d42] block mt-0.5">
                  5th Floor Conference Hall
                </span>
              </div>
              <div className="bg-[#f4f5fa] p-3 rounded-2xl border border-slate-200/60 text-center">
                <span className="text-[10px] font-bold text-[#8a92a6] uppercase tracking-wider flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#7065f0]" /> Standup Time
                </span>
                <span className="text-xs font-bold text-[#232d42] block mt-0.5">
                  Sharp 10:00 AM IST (Window: 09:50 – 10:20 AM)
                </span>
              </div>
            </div>

            {/* High-Resolution Static QR Code */}
            <div className="my-6 flex flex-col items-center justify-center">
              <div className="p-4 bg-white rounded-3xl border-4 border-[#7065f0] shadow-md relative">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Boardroom Check-In QR"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-[#7065f0]" />
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold text-[#7065f0] mt-3 uppercase tracking-wider">
                Scan with any Smartphone Camera or Scanner App
              </span>
            </div>

            {/* Direct Target URL */}
            <div className="p-3 bg-[#f4f5fa] rounded-2xl border border-slate-200/60 text-center">
              <span className="text-[10px] font-bold text-[#8a92a6] uppercase tracking-wider block">
                Direct Portal Web Address:
              </span>
              <a
                href={TARGET_CHECKIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono font-bold text-[#7065f0] hover:underline"
              >
                {TARGET_CHECKIN_URL}
              </a>
            </div>

            {/* Footer Compliance Notice */}
            <div className="mt-5 pt-3 border-t border-slate-100 text-center">
              <span className="text-[10px] font-semibold text-slate-500">
                Hospital Director's Audit • Single Daily Submission Enforced • Geofenced to 5th Floor
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
