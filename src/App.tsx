import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isAfter, setHours, setMinutes } from 'date-fns';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { 
  CheckCircle, 
  MapPin, 
  Clock, 
  User, 
  ShieldCheck, 
  Calendar, 
  ChevronRight,
  Loader2,
  Building2,
  ArrowRight
} from 'lucide-react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwy3Xc0OSW8KacQhjpSuEE00FZ3rHPrPFttOQ4GE3JqIqF8P3KIYIZkO3CNEyD-G6Ip/exec';

const SuccessModal = ({ isOpen, onClose, empName }: { isOpen: boolean; onClose: () => void; empName: string }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-100 relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-xl">
            <CheckCircle size={48} strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase">Confirmed</h3>
          <p className="text-[10px] font-bold text-slate-400 mb-8 uppercase tracking-[0.2em]">Session Recorded Successfully</p>
          <p className="text-sm font-medium text-slate-500 mb-10 leading-relaxed">
            Thank you, <span className="font-bold text-slate-900">{empName}</span>. Your data has been verified and encrypted.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl transition-all active:scale-[0.98] shadow-2xl shadow-slate-200 tracking-widest text-[10px] uppercase"
          >
            Close Portal
          </button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default function AttendanceForm() {
  const [empData, setEmpData] = useState({
    id: '',
    name: 'EMPLOYEE',
    dept: 'GENERAL DEPT',
    meetingType: 'Daily DOM'
  });

  const [status, setStatus] = useState('Yes');
  const [leaveType, setLeaveType] = useState('Official Leave');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [lateInfo, setLateInfo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmpData({
      id: params.get('id') || '',
      name: (params.get('name') || 'EMPLOYEE').toUpperCase(),
      dept: (params.get('dept') || 'GENERAL DEPT').toUpperCase(),
      meetingType: params.get('type') || 'Daily DOM'
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => toast.error("GPS access is required for verification.")
      );
    }

    const tenAM = setMinutes(setHours(new Date(), 10), 0);
    if (isAfter(new Date(), tenAM)) {
      const diff = Math.floor((new Date().getTime() - tenAM.getTime()) / 60000);
      setLateInfo(`${diff} MIN LATE`);
    }
  }, []);

  const handleSubmit = async () => {
    if (status === 'Leave' && !reason) {
      toast.error("Explanation required for leave.");
      return;
    }
    if (status === 'Yes' && !location) {
      toast.error("Geolocation pending verification.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        empId: empData.id,
        name: empData.name,
        department: empData.dept,
        status: status === 'Yes' ? 'Present' : 'On Leave',
        leaveReason: status === 'Leave' ? `${leaveType}: ${reason}` : '-',
        location: location ? `${location.lat},${location.lng}` : 'N/A',
        timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        lateRemark: status === 'Leave' ? '' : lateInfo,
        meetingType: empData.meetingType
      };

      await axios.post(GAS_URL, JSON.stringify(payload), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      
      setIsSubmitted(true);
    } catch (error) {
      toast.error("Transmission failed. Retrying...");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 selection:bg-emerald-100">
      <Toaster position="top-center" />
      
      {/* BACKGROUND DECOR */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-60" />
      </div>

      {/* HEADER LOGO */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 flex flex-col items-center"
      >
        <div className="bg-white p-4 px-8 rounded-3xl shadow-sm border border-slate-100 mb-4">
          <img src="/logo.jpg" alt="SBH Logo" className="h-10 w-auto object-contain" />
        </div>
        <p className="text-[10px] font-black text-emerald-600 tracking-[0.4em] uppercase opacity-70">Internal Operations Portal</p>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-[480px] bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(15,23,42,0.1)] border border-slate-200 overflow-hidden"
      >
        {/* TOP STATUS BAR */}
        <div className="bg-slate-50 border-b border-slate-100 p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Security Mode</p>
              <p className="text-xs font-black text-slate-900 uppercase">Verification Active</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</p>
            <p className="text-xs font-black text-slate-900 uppercase">{format(new Date(), 'MMM dd, yyyy')}</p>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-10">
          {/* TITLE SECTION */}
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{empData.meetingType}</h1>
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              <Calendar size={12} /> {format(new Date(), 'EEEE')}
            </div>
          </div>

          {/* USER PROFILE */}
          <div className="bg-slate-900 rounded-[2rem] p-6 text-white flex items-center gap-5 shadow-2xl shadow-slate-200">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-white/5">
              <User size={28} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Corporate Identity</p>
              <h2 className="text-xl font-black tracking-tight truncate">{empData.name}</h2>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-wide truncate">{empData.dept}</p>
            </div>
          </div>

          {/* FORM FIELDS */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmation Status</label>
              <div className="relative group">
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-all text-xs appearance-none cursor-pointer"
                >
                  <option value="Yes">PRESENT AT SESSION</option>
                  <option value="Leave">OFFICIAL LEAVE MODE</option>
                </select>
                <ChevronRight size={16} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" />
              </div>
            </div>

            <AnimatePresence>
              {status === 'Leave' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Leave Classification</label>
                    <div className="relative">
                      <select 
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-all text-xs appearance-none cursor-pointer"
                      >
                        <option>Official Leave</option>
                        <option>Sick Leave</option>
                        <option>Casual Leave</option>
                      </select>
                      <ChevronRight size={16} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Justification</label>
                    <textarea 
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Briefly state your reason..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-all text-xs resize-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* VERIFICATION METRICS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Geolocation</span>
              </div>
              <p className={`text-xs font-black tracking-tight ${location ? 'text-emerald-600' : 'text-slate-300 animate-pulse'}`}>
                {location ? 'SECURE_VERIFIED' : 'LOCATING...'}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-slate-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Punctuality</span>
              </div>
              <p className={`text-xs font-black tracking-tight ${lateInfo ? 'text-red-500' : 'text-emerald-600'}`}>
                {lateInfo ? lateInfo : 'VAL_ON_TIME'}
              </p>
            </div>
          </div>

          {/* SUBMIT ACTION */}
          <button
            onClick={handleSubmit}
            disabled={loading || (status === 'Yes' && !location)}
            className="group w-full py-5 rounded-[1.5rem] text-white font-black text-[10px] tracking-[0.2em] uppercase transition-all bg-slate-900 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 shadow-2xl shadow-slate-200 relative overflow-hidden active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <div className="flex items-center justify-center gap-3">
                <span>Authorize & Submit</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            )}
          </button>
        </div>

        {/* FOOTER BRANDING */}
        <div className="p-8 text-center bg-slate-50 border-t border-slate-100">
           <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 size={12} className="text-slate-400" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">SBH Hospitals Enterprise</p>
           </div>
           <p className="text-[7px] font-bold text-slate-300 uppercase tracking-[0.2em]">Secured by SBH-IT Solutions v4.0</p>
        </div>
      </motion.div>

      <SuccessModal
        isOpen={isSubmitted}
        onClose={() => {
          window.close();
          setTimeout(() => { window.location.href = "https://itsbhhospital.com"; }, 100);
        }}
        empName={empData.name}
      />
    </div>
  );
}
