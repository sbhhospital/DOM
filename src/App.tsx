import { useState, useEffect } from 'react';
import { 
  Send, 
  Loader2,
  MapPin,
  Clock,
  ShieldCheck,
  User,
  CheckCircle,
  MessageSquare,
  Building2,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isAfter, setHours, setMinutes } from 'date-fns';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwy3Xc0OSW8KacQhjpSuEE00FZ3rHPrPFttOQ4GE3JqIqF8P3KIYIZkO3CNEyD-G6Ip/exec';

type AttendanceStatus = 'Yes' | 'Leave';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  empName: string;
  meetingType: string;
}

const SuccessModal = ({ isOpen, onClose, empName, meetingType }: SuccessModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2rem] p-10 max-w-sm w-full text-center shadow-2xl border border-slate-100 relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-2 bg-emerald-500"></div>
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
          <CheckCircle strokeWidth={3} size={40} />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight uppercase">Confirmed!</h3>
        <p className="text-[10px] font-bold text-slate-500 mb-6 uppercase tracking-widest">Attendance Recorded</p>

        <p className="text-xs font-medium text-slate-500 mb-8 leading-relaxed">
          Thank you, <span className="font-bold text-slate-900">{empName}</span>. Your attendance for <span className="font-bold text-slate-900">{meetingType}</span> has been securely logged into the system.
        </p>

        <button
          onClick={onClose}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black py-4 rounded-2xl transition-all active:scale-[0.98] tracking-widest uppercase shadow-lg shadow-emerald-200"
        >
          Close Portal
        </button>
      </motion.div>
    </div>
  );
};

function App() {
  const [empData, setEmpData] = useState({
    id: '',
    name: '',
    dept: '',
    meetingType: 'Daily DOM'
  });

  const [status, setStatus] = useState<AttendanceStatus | ''>('');
  const [leaveReason, setLeaveReason] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lateInfo, setLateInfo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmpData({
      id: params.get('id') || '',
      name: (params.get('name') || 'Employee').toUpperCase(),
      dept: (params.get('dept') || 'General Dept').toUpperCase(),
      meetingType: params.get('type') || 'Daily DOM'
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.error(err);
          toast.error("Location tracking required for security verification.");
        }
      );
    }
  }, []);

  useEffect(() => {
    const tenAM = setMinutes(setHours(new Date(), 10), 0);
    if (isAfter(new Date(), tenAM)) {
      const diff = Math.floor((new Date().getTime() - tenAM.getTime()) / 60000);
      setLateInfo(`${diff} MIN LATE`);
    } else {
      setLateInfo('');
    }
  }, [currentTime]);

  const handleSubmit = async () => {
    if (!status) {
      toast.error("Please select your status.");
      return;
    }
    if (!location && status === 'Yes') {
      toast.error("GPS validation is required for submission.");
      return;
    }
    if (status === 'Leave' && !leaveReason) {
      toast.error("Please provide a reason for leave.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        empId: empData.id,
        name: empData.name,
        department: empData.dept,
        status: status === 'Yes' ? 'Present' : 'On Leave',
        leaveReason: leaveReason,
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
      toast.error("Network error. Retrying submission...");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    window.close();
    // Fallback if window.close() is blocked
    setTimeout(() => {
      window.location.href = "https://itsbhhospital.com";
    }, 100);
  };

  return (
    <div className="app-container">
      <Toaster position="top-center" />
      
      <div className="logo-section">
        <img 
          src="/logo.jpg" 
          alt="SBH Hospital" 
          className="logo-img"
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/200x80?text=SBH+HOSPITAL';
          }}
        />
      </div>

      <div className="text-center mb-8">
        <p className="text-[10px] font-black text-emerald-600 tracking-[0.3em] uppercase opacity-80 mb-2">Internal Attendance Portal</p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{empData.meetingType}</h1>
      </div>

      <div className="main-card">
        <div className="h-2 bg-slate-100 flex">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: status ? '100%' : '50%' }}
            className="bg-emerald-500 h-full transition-all duration-500"
          />
        </div>

        <div className="p-8 md:p-10">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
                <User size={12} className="text-emerald-500" /> Professional Identity
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-6 flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-emerald-600 shadow-sm font-black text-xl">
                  {empData.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">{empData.name}</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">{empData.dept}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="input-label">Attendance Confirmation</label>
              <div className="relative">
                <select
                  className="form-input appearance-none"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                >
                  <option value="">Choose Status...</option>
                  <option value="Yes">PRESENT (JOINING MEETING)</option>
                  <option value="Leave">OFFICIAL LEAVE</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Clock size={14} />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {status === 'Leave' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="input-label">
                    <MessageSquare size={12} className="text-emerald-500" /> Leave Reason
                  </label>
                  <textarea
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Describe the reason for leave..."
                    className="form-input h-28 resize-none py-4"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="status-grid">
              <div className="status-item">
                <div className="status-title">Geolocation</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${location ? 'bg-emerald-500' : 'bg-slate-300 animate-pulse'}`}></div>
                  <span className="status-value">{location ? 'VERIFIED' : 'LOCATING...'}</span>
                </div>
              </div>
              <div className="status-item">
                <div className="status-title">Punctuality</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${lateInfo ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                  <span className={`status-value ${lateInfo ? 'text-red-600' : 'text-emerald-600'}`}>
                    {lateInfo ? lateInfo : 'ON TIME'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !status || (!location && status === 'Yes')}
              className="btn-submit"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Submit Verification <Send size={14} /></>
              )}
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center">
        <div className="flex justify-center gap-6 text-slate-300 mb-4 opacity-40">
           <ShieldCheck size={20} />
           <MapPin size={20} />
           <Building2 size={20} />
           <Calendar size={20} />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">SBH Hospital Automation</p>
        <p className="text-[8px] text-slate-400 font-bold mt-1 opacity-50 uppercase tracking-widest">Secured Enterprise Verification System</p>
      </footer>

      <SuccessModal
        isOpen={isSubmitted}
        onClose={handleClose}
        empName={empData.name}
        meetingType={empData.meetingType}
      />
    </div>
  );
}

export default App;
