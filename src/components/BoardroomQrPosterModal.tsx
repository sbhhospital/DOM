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
  CheckCircle2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  FileDown,
  Sparkles,
  Smartphone,
  ScanLine,
  Shield,
  Layers,
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
  const [activeTab, setActiveTab] = useState<'terminal' | 'poster'>('terminal');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFitToScreen, setIsFitToScreen] = useState(true);

  // Generate instant local base64 QR code
  useEffect(() => {
    QRCode.toDataURL(TARGET_CHECKIN_URL, {
      width: 700,
      margin: 1,
      color: {
        dark: '#1e1b4b',
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
      {/* Container with Hope UI styling */}
      <div className="bg-white rounded-[28px] sm:rounded-3xl shadow-2xl max-w-5xl w-full my-auto overflow-hidden border border-[#f0f1f8] flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Control Bar matching Hope UI Executive Banner */}
        <div className="px-4 sm:px-6 py-3.5 bg-white text-[#232d42] flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-[#f0f1f8] relative overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7065f0] to-[#8c7ff8] text-white flex items-center justify-center shadow-sm shadow-indigo-300/40 shrink-0">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-[#232d42] truncate">
                  Boardroom Attendance QR Hub
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#eff0fe] text-[#7065f0] border border-indigo-200/60 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Terminal v2.1
                </span>
              </div>
              <p className="text-[11px] text-[#8a92a6] font-medium truncate">
                5th Floor Conference Hall • Physical Scan Terminal ({formatToIndianDate(selectedDate)})
              </p>
            </div>
          </div>

          {/* Interactive Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'terminal'
                  ? 'bg-white text-[#7065f0] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Smart Screen</span>
            </button>
            <button
              onClick={() => setActiveTab('poster')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'poster'
                  ? 'bg-white text-[#7065f0] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Printable A4 Poster</span>
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#f4f5fa] hover:bg-slate-200/60 text-[#232d42] border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Copy Check-In Link"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isCopied ? 'Copied!' : 'Copy URL'}</span>
            </button>

            {/* Download A4 PDF Button (Clean without broken emoji) */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-1.5 bg-[#1aa053] hover:bg-[#15803d] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Download official print-ready A4 PDF without any garbled text"
            >
              {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span>{isDownloadingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>

            {/* Download PNG Button */}
            <button
              onClick={handleDownloadPng}
              disabled={isDownloadingPng}
              className="hidden sm:flex px-3 py-1.5 bg-[#7065f0] hover:bg-[#5e52e4] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs shadow-indigo-500/20 items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              {isDownloadingPng ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isDownloadingPng ? 'Exporting...' : 'PNG'}</span>
            </button>

            {/* Print A4 Button */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white hover:bg-[#f4f5fa] text-[#232d42] border border-slate-200 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Print directly to hospital printer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden sm:inline">Print A4</span>
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#f8fafc]">

          {/* ================= TAB 1: SMART SCREEN TERMINAL ================= */}
          {activeTab === 'terminal' && (
            <div className="max-w-2xl mx-auto space-y-4">
              {/* High-Tech Terminal Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-indigo-100 relative overflow-hidden text-center">
                <div className="h-2 w-full bg-gradient-to-r from-[#7065f0] via-[#5ec4c7] to-[#1aa053] absolute top-0 left-0" />

                {/* Hospital Brand & Terminal Identity */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <img src={sbhLogo} alt="SBH Logo" className="h-9 w-auto object-contain" />
                    <div className="text-left">
                      <div className="text-xs font-black uppercase text-[#232d42] leading-none">
                        SBH Group of Hospitals
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        Raipur Central Operations
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live GPS Geofence Active</span>
                  </div>
                </div>

                {/* Central Futuristic QR Scanner Target Frame */}
                <div className="my-6 relative flex flex-col items-center justify-center">
                  <div className="relative p-6 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 rounded-3xl border-2 border-indigo-200/80 shadow-md">
                    {/* Targeting Corner Brackets */}
                    <div className="absolute top-2 left-2 w-5 h-5 border-t-3 border-l-3 border-[#7065f0] rounded-tl-lg" />
                    <div className="absolute top-2 right-2 w-5 h-5 border-t-3 border-r-3 border-[#7065f0] rounded-tr-lg" />
                    <div className="absolute bottom-2 left-2 w-5 h-5 border-b-3 border-l-3 border-[#7065f0] rounded-bl-lg" />
                    <div className="absolute bottom-2 right-2 w-5 h-5 border-b-3 border-r-3 border-[#7065f0] rounded-br-lg" />

                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="Live Boardroom Check-in QR"
                        className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-2xl shadow-inner bg-white p-2"
                      />
                    ) : (
                      <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-[#7065f0]" />
                      </div>
                    )}
                  </div>

                  {/* Scan Instructions Pill */}
                  <div className="mt-4 flex items-center gap-2 bg-[#eff0fe] text-[#7065f0] border border-purple-200 px-4 py-1.5 rounded-full text-xs font-bold shadow-2xs">
                    <ScanLine className="w-4 h-4 text-[#7065f0] animate-pulse" />
                    <span>Point Smartphone Camera or Any Scanner to Check In</span>
                  </div>
                </div>

                {/* Location & Time Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4">
                  <div className="bg-[#f8fafc] p-3 rounded-2xl border border-slate-200/70 flex items-center gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venue</div>
                      <div className="text-xs font-black text-[#232d42]">5th Floor Conference Hall</div>
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] p-3 rounded-2xl border border-slate-200/70 flex items-center gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-[#7065f0] flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Window</div>
                      <div className="text-xs font-black text-[#232d42]">09:50 AM – 10:20 AM IST</div>
                    </div>
                  </div>
                </div>

                {/* Direct Link with Test Check-In Action */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-left">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                      Direct Terminal URL
                    </span>
                    <span className="text-xs font-mono font-bold text-[#7065f0] truncate block">
                      {TARGET_CHECKIN_URL}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer"
                    >
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                    <a
                      href={TARGET_CHECKIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-xs font-bold text-white bg-[#7065f0] hover:bg-[#5e52e4] rounded-xl flex items-center gap-1"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* 3-Step Protocol Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center mb-1.5">
                    1
                  </div>
                  <div className="text-xs font-bold text-slate-900">Scan In Boardroom</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Scan upon entering 5th Floor Conference Hall before 10:00 AM.
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center mb-1.5">
                    2
                  </div>
                  <div className="text-xs font-bold text-slate-900">Select Name & PIN</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Choose your department leader profile and confirm presence.
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-[#7065f0] text-white font-black text-xs flex items-center justify-center mb-1.5">
                    3
                  </div>
                  <div className="text-xs font-bold text-slate-900">Audit Locked</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Presence is recorded once per day and transmitted to Director Sir.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: PRINTABLE A4 POSTER PREVIEW ================= */}
          {activeTab === 'poster' && (
            <div className="flex flex-col items-center justify-center">
              <div className="mb-3 flex items-center justify-between w-full max-w-[700px] text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-[#7065f0]" />
                  <span>Standard A4 Paper Ratio (210mm × 297mm)</span>
                </span>
                <button
                  onClick={() => setIsFitToScreen(!isFitToScreen)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 cursor-pointer flex items-center gap-1"
                >
                  {isFitToScreen ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                  <span>{isFitToScreen ? 'Full Zoom' : 'Fit Screen'}</span>
                </button>
              </div>

              {/* Exact A4 Ratio Poster Container */}
              <div
                ref={posterRef}
                id="sbh-boardroom-a4-poster"
                className={`w-full max-w-[700px] bg-white rounded-3xl shadow-xl border border-slate-300 p-6 sm:p-8 text-[#0f172a] relative overflow-hidden transition-all duration-200 ${
                  isFitToScreen ? 'max-h-[78vh] overflow-y-auto custom-scrollbar' : ''
                }`}
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {/* Top Prestige Bar: Deep Navy + Hospital Emerald */}
                <div className="h-2 w-full flex rounded-full overflow-hidden mb-5">
                  <div className="h-full w-2/3 bg-[#0f172a]" />
                  <div className="h-full w-1/3 bg-[#059669]" />
                </div>

                {/* Double Border Inner Container */}
                <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-6 bg-white">
                  {/* Header: Hospital Logo & Title */}
                  <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
                    <img
                      src={sbhLogo}
                      alt="SBH Group of Hospitals"
                      className="h-12 sm:h-14 w-auto object-contain mb-3 drop-shadow-xs mx-auto"
                    />
                    <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider mb-2">
                      Hospital Operations & Management Command
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight uppercase">
                      DAILY OPERATIONS STANDUP (DOM)
                    </h1>
                    <p className="text-xs text-amber-600 font-bold mt-1 uppercase tracking-wider">
                      Official In-Person Boardroom Attendance Terminal
                    </p>
                  </div>

                  {/* Session Info Badges */}
                  <div className="grid grid-cols-3 gap-2.5 my-4">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">
                        PHYSICAL VENUE
                      </span>
                      <span className="text-[11px] font-black text-[#0f172a] block mt-0.5">
                        Conference Room, 5th Floor
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">
                        DAILY CADENCE
                      </span>
                      <span className="text-[11px] font-black text-[#0f172a] block mt-0.5">
                        Daily Sharp 10:00 AM IST
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">
                        SCAN WINDOW
                      </span>
                      <span className="text-[11px] font-black text-[#0f172a] block mt-0.5">
                        09:45 AM – 10:00 AM IST
                      </span>
                    </div>
                  </div>

                  {/* High-Resolution Clean QR Code Box with Corner L-Brackets */}
                  <div className="my-5 flex flex-col items-center justify-center">
                    <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border-2 border-[#059669] shadow-sm relative">
                      {/* Targeting Corner Brackets in Emerald */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#059669] rounded-tl" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#059669] rounded-tr" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#059669] rounded-bl" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#059669] rounded-br" />

                      {qrCodeDataUrl ? (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-inner">
                          <img
                            src={qrCodeDataUrl}
                            alt="Boardroom Check-In QR"
                            className="w-52 h-52 sm:w-60 sm:h-60 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
                          <Loader2 className="w-10 h-10 animate-spin text-[#059669]" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-black text-[#0f172a] mt-3 uppercase tracking-wider text-center">
                      SCAN WITH SMARTPHONE CAMERA TO CONFIRM ATTENDANCE
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium text-center mt-0.5">
                      Open your phone camera or scanner app to access the official SBH Attendance Portal.
                    </span>
                  </div>

                  {/* Direct Target URL */}
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-center my-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1.5">
                      Target:
                    </span>
                    <a
                      href={TARGET_CHECKIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono font-bold text-[#0f172a] hover:underline"
                    >
                      {TARGET_CHECKIN_URL}
                    </a>
                  </div>

                  {/* 3-Step Protocol */}
                  <div className="grid grid-cols-3 gap-2.5 my-4">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          1
                        </span>
                        <span className="text-[10px] font-bold text-[#0f172a]">Scan In Boardroom</span>
                      </div>
                      <div className="text-[9px] text-slate-500 pl-6 leading-tight">
                        Scan upon entering 5th Floor Hall.
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          2
                        </span>
                        <span className="text-[10px] font-bold text-[#0f172a]">Verify Identity</span>
                      </div>
                      <div className="text-[9px] text-slate-500 pl-6 leading-tight">
                        Select your name & confirm PIN.
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          3
                        </span>
                        <span className="text-[10px] font-bold text-[#0f172a]">Single Audit Lock</span>
                      </div>
                      <div className="text-[9px] text-slate-500 pl-6 leading-tight">
                        Attendance locked for Director audit.
                      </div>
                    </div>
                  </div>

                  {/* Footer SOP Terms */}
                  <div className="pt-3 border-t border-slate-200 text-left text-[9px] text-slate-600 space-y-1">
                    <div className="font-bold text-[#0f172a] uppercase tracking-wider">
                      STANDING OPERATING PROCEDURE (SOP) & COMPLIANCE TERMS:
                    </div>
                    <div>• Punctuality Standard: Leaders attending physically must scan before 10:00 AM sharp. Late scans audited as Late Arrival.</div>
                    <div>• Single Daily Count Guarantee: Presence is recorded once per day. Rejoining preserves initial check-in timestamp.</div>
                    <div>• Automated Director Report: The DOM Register is finalized at 10:30 AM IST and transmitted directly to the Hospital Director.</div>
                    <div>• Boardroom Exclusivity: This QR terminal is valid strictly for physical presence inside the 5th Floor Boardroom.</div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>SBH GROUP OF HOSPITALS • Raipur Central Operations</span>
                    <span>Authorized by Director Sir & Hospital Operations Command</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
