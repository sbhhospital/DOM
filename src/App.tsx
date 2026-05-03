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
  Info
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
          toast.error("Location tracking required for verification.");
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
      toast.error("Please select a response status.");
      return;
    }
    if (!location && status === 'Yes') {
      toast.error("GPS verification is mandatory.");
      return;
    }
    if ((status === 'No' || status === 'Leave') && !leaveReason) {
      toast.error("Please provide a brief reason.");
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
      toast.error("Transmission failed. Retrying...");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-wrapper">
      <Toaster position="top-center" />
      
      {/* Success Modal */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="modal-backdrop"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className="success-card"
            >
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-green-100">
                <PartyPopper className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-4">CONFIRMED</h2>
              <p className="text-gray-500 text-lg font-medium leading-relaxed mb-12">
                Thank you, {empData.name}. Your session has been securely verified and logged.
              </p>
              <button 
                onClick={() => window.close()}
                className="btn-primary"
              >
                Exit Portal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-panel">
        <div className="logo-container">
          <img 
            src="/logo.jpg" 
            alt="Hospital Logo" 
            className="logo-img"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/300x100?text=SBH+HOSPITAL';
            }}
          />
        </div>

        <header className="header-title">
          <h1 className="meeting-type">{empData.meetingType}</h1>
          <div className="date-badge">
            <Calendar size={16} />
            <span>{format(new Date(), 'EEEE, MMMM do, yyyy')}</span>
          </div>
        </header>

        {/* Profile Identity */}
        <div className="profile-card">
          <div className="profile-avatar shadow-lg shadow-green-900/10">
            <User size={28} />
          </div>
          <div className="profile-info">
            <p className="text-[10px] text-green-600 font-black uppercase tracking-widest mb-0.5">Corporate Identity</p>
            <h3>{empData.name}</h3>
            <p>{empData.dept}</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="input-group">
            <label className="form-label">Attendance Confirmation</label>
            <select 
              className="fluent-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            >
              <option value="" disabled>Select response status...</option>
              <option value="Yes">PRESENT AT MEETING</option>
              <option value="No">ABSENT / UNAVAILABLE</option>
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
                  <label className="form-label">Provide Reason</label>
                  <textarea 
                    className="fluent-textarea"
                    placeholder="Briefly explain your status..."
                    rows={3}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="stat-item">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={16} className="text-green-600" />
                <span className="text-[10px] font-black text-gray-400 uppercase">GPS Validation</span>
              </div>
              <p className="text-xs font-bold text-gray-700">{location ? 'VERIFIED' : 'LOCATING...'}</p>
            </div>
            <div className="stat-item">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-orange-600" />
                <span className="text-[10px] font-black text-gray-400 uppercase">Time Status</span>
              </div>
              <p className={`text-xs font-bold ${lateInfo && status === 'Yes' ? 'text-red-600' : 'text-green-600'}`}>
                {(lateInfo && status === 'Yes') ? lateInfo : 'ON TIME'}
              </p>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !status || (!location && status === 'Yes')}
            className={`btn-primary ${status === 'Yes' ? '' : 'btn-orange'} active:scale-95 transition-transform`}
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <span>VERIFY & SUBMIT</span>
                <Send size={20} />
              </>
            )}
          </button>
        </div>

        <footer className="mt-16 text-center">
          <div className="flex justify-center gap-4 text-gray-300 mb-4 opacity-40">
             <ShieldCheck size={20} />
             <Info size={20} />
             <Building2 size={20} />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">SBH Hospital IT Automation</p>
          <p className="text-[8px] text-gray-300 font-bold mt-1">SECURED MULTI-LAYER VERIFICATION</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
