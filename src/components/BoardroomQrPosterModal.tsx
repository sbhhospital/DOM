import React, { useRef } from 'react';
import { QrCode, Printer, X, Download, ShieldCheck, MapPin, Clock, FileText, CheckCircle2 } from 'lucide-react';
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

  if (!isOpen) return null;

  const targetCheckInUrl = `${window.location.origin}/boardroom-checkin`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=380x380&format=png&margin=1&color=0f172a&bgcolor=ffffff&data=${encodeURIComponent(
    targetCheckInUrl
  )}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-200 flex flex-col max-h-[96vh]">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight">
                Official SBH Boardroom QR Poster (A4 Printable)
              </h3>
              <p className="text-[11px] text-slate-400">
                Print or download in A4 format to display inside 5th Floor Conference Room
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Poster</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Poster Preview Body (Scrollable in modal, 100% visible in Print) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 flex items-center justify-center print:p-0 print:bg-white print:overflow-visible">
          {/* Exact A4 Ratio Poster Container */}
          <div
            ref={posterRef}
            id="sbh-boardroom-a4-poster"
            className="w-full max-w-[760px] bg-white rounded-2xl shadow-xl border border-slate-300 p-8 sm:p-10 text-slate-800 relative overflow-hidden print:border-none print:shadow-none print:rounded-none print:p-8 print:max-w-none print:w-full"
            style={{ minHeight: '1020px' }}
          >
            {/* Top Tricolor Accent Bar */}
            <div className="h-2.5 w-full bg-gradient-to-r from-orange-500 via-emerald-500 to-green-700 rounded-full mb-6" />

            {/* Header: Logo & Hospital Operations */}
            <div className="flex flex-col items-center text-center pb-6 border-b-2 border-slate-200">
              <img
                src={sbhLogo}
                alt="SBH Group of Hospitals"
                className="h-16 sm:h-20 w-auto object-contain mb-3 drop-shadow-xs"
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-300 uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Clinical Governance & Operations Command
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                DAILY OPERATIONS STANDUP (DOM)
              </h1>
              <p className="text-xs sm:text-sm font-bold text-orange-600 uppercase tracking-widest mt-1">
                Official Boardroom Attendance Check-In Terminal
              </p>
            </div>

            {/* Session Detail Badges */}
            <div className="grid grid-cols-3 gap-3 my-6 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-orange-600" /> Venue
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">
                  Conference Room, 5th Floor
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-600" /> Cadence
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">
                  Daily Sharp 10:00 AM IST
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" /> Scan Window
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">
                  09:45 AM – 10:00 AM IST
                </div>
              </div>
            </div>

            {/* Central Colorful QR Frame */}
            <div className="my-6 flex flex-col items-center justify-center text-center">
              <div className="p-6 bg-gradient-to-tr from-orange-50 via-white to-emerald-50 rounded-3xl border-4 border-emerald-500 shadow-xl inline-block relative">
                <div className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 inline-block">
                  <img
                    src={qrCodeUrl}
                    alt="SBH Boardroom Attendance QR Code"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto"
                  />
                </div>
                {/* Center Badge Overlay */}
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-900 text-white shadow-sm">
                  <span>🔒 High-Security In-Person Audit</span>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  SCAN WITH SMARTPHONE CAMERA TO CONFIRM ATTENDANCE
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Point your mobile phone camera or QR scanner at the code above to open the secure SBH Leadership Check-in Terminal.
                </p>
                <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 inline-block font-bold mt-1">
                  Target: {targetCheckInUrl}
                </div>
              </div>
            </div>

            {/* 3-Step Leader Protocol */}
            <div className="grid grid-cols-3 gap-3 my-6 text-xs">
              <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center mb-1.5">
                  1
                </div>
                <div className="font-bold text-slate-900">Scan In Boardroom</div>
                <div className="text-[11px] text-slate-600 mt-0.5">Scan upon entering 5th Floor Conference Hall.</div>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center mb-1.5">
                  2
                </div>
                <div className="font-bold text-slate-900">Verify Identity</div>
                <div className="text-[11px] text-slate-600 mt-0.5">Authenticate with your Leader ID & PIN.</div>
              </div>
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center mb-1.5">
                  3
                </div>
                <div className="font-bold text-slate-900">Single Audit Lock</div>
                <div className="text-[11px] text-slate-600 mt-0.5">Presence timestamped once for Director's audit.</div>
              </div>
            </div>

            {/* Official Terms & Conditions / SOP (Designed for Director Sir) */}
            <div className="mt-6 pt-5 border-t-2 border-slate-200 space-y-2 text-[11px] text-slate-600">
              <div className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-orange-600" />
                <span>Standing Operating Procedure (SOP) & Compliance Terms:</span>
              </div>
              <ul className="space-y-1.5 pl-4 list-disc marker:text-emerald-600">
                <li>
                  <strong className="text-slate-800">Punctuality Standard:</strong> Leaders attending physically must scan before 10:00 AM sharp. Scans after 10:00 AM are audited as Late Arrival and require administrative sign-off.
                </li>
                <li>
                  <strong className="text-slate-800">Single Daily Count Guarantee:</strong> Your physical attendance is locked to ONE count per day. Rejoining or rescanning preserves your initial recorded check-in timestamp.
                </li>
                <li>
                  <strong className="text-slate-800">Automated Director Report:</strong> The DOM Operations Register is officially finalized at 10:30 AM IST and transmitted directly to the Hospital Director and Executive Leadership.
                </li>
                <li>
                  <strong className="text-slate-800">Authenticity Assurance:</strong> This QR terminal is valid strictly for physical presence inside the 5th Floor Boardroom. Misuse or remote sharing is strictly prohibited under Clinical Governance policy.
                </li>
              </ul>
            </div>

            {/* Bottom Signature & Authorization Line */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">SBH GROUP OF HOSPITALS</span>
                <span>•</span>
                <span>Raipur Central Command</span>
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
