import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isAfter, setHours, setMinutes } from 'date-fns';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Menu, 
  LogOut, 
  User, 
  Phone, 
  MessageSquare, 
  Clock, 
  MapPin, 
  CheckCircle,
  Gift,
  Loader2
} from 'lucide-react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwy3Xc0OSW8KacQhjpSuEE00FZ3rHPrPFttOQ4GE3JqIqF8P3KIYIZkO3CNEyD-G6Ip/exec';

const SuccessModal = ({ isOpen, onClose, empName }: { isOpen: boolean; onClose: () => void; empName: string }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Verified!</h3>
          <p className="text-sm text-slate-500 mb-8">
            Thank you <span className="font-bold">{empName}</span>, your attendance has been securely logged.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-[#b47b00] hover:bg-[#8e6100] text-white font-bold py-4 rounded-2xl transition-all shadow-lg"
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
        () => toast.error("Location tracking required.")
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
      toast.error("Reason required.");
      return;
    }
    if (status === 'Yes' && !location) {
      toast.error("GPS Verification pending.");
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
      toast.error("Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#2c3e41] flex flex-col items-center justify-center p-0 md:p-4 font-sans">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-[480px] bg-white rounded-none md:rounded-[3.5rem] shadow-2xl flex flex-col min-h-screen md:min-h-[auto] overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
          <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-emerald-700 shadow-sm">
            <Menu size={24} />
          </div>
          <img src="/logo.jpg" alt="SBH" className="h-10 w-auto" />
          <div 
            onClick={() => window.close()}
            className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-emerald-700 shadow-sm cursor-pointer"
          >
            <LogOut size={24} />
          </div>
        </div>

        {/* CLINIC TITLE */}
        <div className="text-center pt-8 pb-4">
          <h1 className="text-2xl font-black text-[#6d4c1a] tracking-tight">SBH DOM SYSTEM</h1>
          <p className="text-[10px] font-black text-[#b47b00] tracking-[0.3em] uppercase mt-1">Operations Solutions</p>
        </div>

        <div className="px-8 pb-12 space-y-8">
          
          <div className="text-center space-y-1 mt-4">
            <p className="text-[10px] font-bold text-[#b47b00] tracking-[0.2em] uppercase">Today's Session</p>
            <h2 className="text-2xl font-black text-[#6d4c1a] leading-tight uppercase">
              {empData.meetingType} WORTH PRESENCE
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">For our privileged staff</p>
          </div>

          {/* FORM FIELDS */}
          <div className="space-y-6">
            
            {/* FULL NAME */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  readOnly 
                  value={empData.name}
                  className="w-full bg-[#fefcf8] border border-[#fdf0d5] rounded-2xl px-6 py-4 font-bold text-slate-800 text-sm outline-none"
                />
                <User size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#b47b00]" />
              </div>
            </div>

            {/* STATUS SELECTION */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmation Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#fefcf8] border border-[#fdf0d5] rounded-2xl px-6 py-4 font-bold text-slate-800 text-sm outline-none appearance-none"
              >
                <option value="Yes">PRESENT AT MEETING</option>
                <option value="Leave">OFFICIAL LEAVE</option>
              </select>
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Leave Type</label>
                    <select 
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full bg-[#fefcf8] border border-[#fdf0d5] rounded-2xl px-6 py-4 font-bold text-slate-800 text-sm outline-none"
                    >
                      <option>Official Leave</option>
                      <option>Sick Leave</option>
                      <option>Casual Leave</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason</label>
                    <textarea 
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Describe your reason..."
                      className="w-full bg-[#fefcf8] border border-[#fdf0d5] rounded-2xl px-6 py-4 font-bold text-slate-800 text-sm outline-none resize-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* STATUS GRID */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-[#fefcf8] border border-[#fdf0d5] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <MapPin size={16} className="text-[#b47b00] mb-1" />
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Geolocation</p>
                <p className={`text-[11px] font-black ${location ? 'text-emerald-600' : 'text-slate-300 animate-pulse'}`}>
                  {location ? 'VERIFIED ✅' : 'LOCATING...'}
                </p>
              </div>
              <div className="bg-[#fefcf8] border border-[#fdf0d5] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <Clock size={16} className="text-[#b47b00] mb-1" />
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Punctuality</p>
                <p className={`text-[11px] font-black ${lateInfo ? 'text-red-500' : 'text-emerald-600'}`}>
                  {lateInfo ? `${lateInfo} ⚠️` : 'ON TIME ✅'}
                </p>
              </div>
            </div>

            {/* CLAIM BUTTON */}
            <button
              onClick={handleSubmit}
              disabled={loading || (status === 'Yes' && !location)}
              className="w-full h-20 bg-[#b47b00] hover:bg-[#8e6100] text-white rounded-[1.25rem] shadow-xl shadow-[#b47b00]/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <Gift size={24} />
                  <span className="font-black text-sm tracking-[0.2em] uppercase">VERIFY & SUBMIT PRESENCE</span>
                </>
              )}
            </button>

            <div className="text-center pt-4">
              <p className="text-[10px] font-black text-[#b47b00] uppercase tracking-widest">System Validation Period</p>
              <p className="text-[11px] font-black text-[#6d4c1a] uppercase mt-1">ACTIVE FOR TODAY: {format(new Date(), 'dd/MM/yy')}</p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-auto h-10 bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 flex items-center justify-center">
          <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
            SBH GROUP OF HOSPITALS
          </span>
        </div>

      </div>

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
