import { useState, useEffect } from 'react';
import { 
  Send, 
  Calendar,
  Building2,
  Loader2,
  MapPin,
  Clock,
  ShieldCheck,
  User,
  PartyPopper,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isAfter, setHours, setMinutes } from 'date-fns';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwy3Xc0OSW8KacQhjpSuEE00FZ3rHPrPFttOQ4GE3JqIqF8P3KIYIZkO3CNEyD-G6Ip/exec';

type AttendanceStatus = 'Yes' | 'No' | 'Leave';

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
          toast.error("Location tracking is required for validation.");
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
      toast.error("Please select a valid response status.");
      return;
    }
    if (!location && status === 'Yes') {
      toast.error("Geolocation is mandatory for 'Present' status.");
      return;
    }
    if ((status === 'No' || status === 'Leave') && !leaveReason) {
      toast.error("Explanation is required for absence or leave.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        empId: empData.id,
        name: empData.name,
        department: empData.dept,
        status: status === 'Yes' ? 'Present' : (status === 'Leave' ? 'On Leave' : 'Absent'),
        leaveReason: leaveReason,
        location: location ? `${location.lat},${location.lng}` : 'N/A',
        timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        lateRemark: (status === 'Leave' || status === 'No') ? '' : lateInfo,
        meetingType: empData.meetingType
      };

      await axios.post(GAS_URL, JSON.stringify(payload), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      
      setIsSubmitted(true);
    } catch (error) {
      toast.error("Transmission failed. Please check your network.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-container">
      <Toaster position="top-center" />
      
      {/* Premium Success Modal */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              className="success-modal"
            >
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/20">
                <PartyPopper className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Submission Success</h2>
              <p className="text-slate-400 mb-10 text-lg leading-relaxed">
                Thank you, {empData.name}. Your attendance for today's {empData.meetingType} has been securely logged.
              </p>
              <button 
                onClick={() => window.close()}
                className="submit-btn"
              >
                Close Portal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card">
        <header className="header-section">
          <div className="flex justify-center mb-8">
            <img 
              src="/logo.png" 
              alt="SBH Hospital Logo" 
              className="h-20 w-auto object-contain drop-shadow-xl"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/200x80?text=SBH+HOSPITAL';
              }}
            />
          </div>
          
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-8">
            <Clock size={16} className="text-emerald-500" />
            <span className="text-sm font-bold tabular-nums text-slate-300">
              {format(currentTime, 'hh:mm:ss a')}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">{empData.meetingType}</h1>
            <p className="text-slate-400 text-sm font-semibold flex items-center justify-center gap-2">
              <Calendar size={14} /> {format(new Date(), 'EEEE, MMMM do, yyyy')}
            </p>
          </div>
        </header>

        {/* Identity Section */}
        <div className="relative group mb-10">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative bg-slate-900/50 border border-white/5 rounded-3xl p-6 flex items-center gap-5">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 shadow-xl">
              <User size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Corporate Profile</p>
              <h3 className="text-xl font-bold text-white leading-tight">{empData.name}</h3>
              <p className="text-slate-400 text-sm font-medium">{empData.dept}</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="input-group">
            <label className="input-label">Attendance Confirmation</label>
            <select 
              className="custom-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            >
              <option value="" disabled>Select response status...</option>
              <option value="Yes">PRESENT AT MEETING</option>
              <option value="No">ABSENT / NOT JOINING</option>
              <option value="Leave">OFFICIAL LEAVE</option>
            </select>
          </div>

          <AnimatePresence>
            {(status === 'No' || status === 'Leave') && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="input-group">
                  <label className="input-label">Reason for {status.toUpperCase()}</label>
                  <textarea 
                    className="custom-textarea"
                    placeholder="Provide official reason here..."
                    rows={3}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Validation Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col p-4 bg-slate-900/40 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={16} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Geolocation</span>
              </div>
              <p className="text-xs font-black text-slate-300 tracking-wide">
                {location ? 'SECURE_ACTIVE' : 'INITIALIZING...'}
              </p>
            </div>
            <div className={`flex flex-col p-4 rounded-2xl border ${lateInfo && status === 'Yes' ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className={lateInfo && status === 'Yes' ? 'text-red-500' : 'text-emerald-500'} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Punctuality</span>
              </div>
              <p className={`text-xs font-black tracking-wide ${lateInfo && status === 'Yes' ? 'text-red-500' : 'text-emerald-500'}`}>
                {(lateInfo && status === 'Yes') ? lateInfo : (status === 'Leave' ? 'LEAVE_MODE' : 'VAL_ON_TIME')}
              </p>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !status || (!location && status === 'Yes')}
            className="submit-btn"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <span>VERIFY & SUBMIT</span>
                <Send size={20} className="ml-1" />
              </>
            )}
          </button>
        </div>

        <footer className="mt-12 text-center">
          <div className="flex justify-center gap-6 text-slate-600 mb-4 opacity-40">
             <ShieldCheck size={20} />
             <MapPin size={20} />
             <AlertCircle size={20} />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">SBH Hospital Automation</p>
          <p className="text-[8px] text-slate-600 mt-2">SECURED MULTI-LAYER AUTHENTICATION SYSTEM</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
