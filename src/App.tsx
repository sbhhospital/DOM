import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Send, 
  Calendar,
  Building2,
  Loader2,
  MapPin,
  Clock,
  ShieldCheck
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
      name: params.get('name') || 'Employee',
      dept: params.get('dept') || 'Department',
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
          toast.error("Location access required for attendance.");
        }
      );
    }
  }, []);

  useEffect(() => {
    const tenAM = setMinutes(setHours(new Date(), 10), 0);
    if (isAfter(new Date(), tenAM)) {
      const diff = Math.floor((new Date().getTime() - tenAM.getTime()) / 60000);
      setLateInfo(`${diff} min late`);
    } else {
      setLateInfo('');
    }
  }, [currentTime]);

  const handleSubmit = async () => {
    if (!status) {
      toast.error("Please select your status");
      return;
    }
    if (!location && status === 'Yes') {
      toast.error("Location is mandatory for attendance");
      return;
    }
    if ((status === 'No' || status === 'Leave') && !leaveReason) {
      toast.error("Please provide a reason");
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
        lateRemark: lateInfo,
        meetingType: empData.meetingType
      };

      await axios.post(GAS_URL, JSON.stringify(payload), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      
      setIsSubmitted(true);
      toast.success("Attendance marked successfully!");
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="fluent-card text-center p-12">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">Success!</h2>
        <p className="text-gray-500 mb-8">Your attendance for {empData.meetingType} has been recorded.</p>
        <div className="bg-gray-50 p-4 rounded-lg text-left border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Timestamp</p>
          <p className="text-lg font-semibold text-gray-700">{format(new Date(), 'hh:mm:ss a')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fluent-card">
      <Toaster position="top-center" />
      
      <header className="fluent-header">
        <div className="flex justify-between items-center mb-6">
          <div className="fluent-logo">
            <Building2 size={24} />
            <span>SBH HOSPITAL</span>
          </div>
          <div className="bg-gray-100 px-3 py-1.5 rounded-md flex items-center gap-2 border border-gray-200">
            <Clock size={14} className="text-gray-500" />
            <span className="text-xs font-bold text-gray-600 tabular-nums">
              {format(currentTime, 'hh:mm:ss a')}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{empData.meetingType}</h1>
          <p className="text-gray-500 text-sm flex items-center gap-1.5">
            <Calendar size={14} /> {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
      </header>

      {/* User Info Card */}
      <div className="bg-gray-50 rounded-xl p-5 mb-8 border border-gray-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center font-bold text-xl text-green-600 border border-gray-100">
              {empData.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 leading-tight">{empData.name}</h3>
              <p className="text-gray-500 text-xs">{empData.dept}</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ShieldCheck size={64} className="text-green-600" />
        </div>
      </div>

      <div className="space-y-6">
        {/* Dropdown Status */}
        <div className="input-group">
          <label className="input-label">Attendance Status</label>
          <div className="relative">
            <select 
              className="fluent-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            >
              <option value="" disabled>Select your status...</option>
              <option value="Yes">Present (I am here)</option>
              <option value="No">Absent (Not joining)</option>
              <option value="Leave">On Leave</option>
            </select>
          </div>
        </div>

        <AnimatePresence>
          {(status === 'No' || status === 'Leave') && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="input-group">
                <label className="input-label">Reason for {status === 'Leave' ? 'Leave' : 'Absence'}</label>
                <textarea 
                  className="fluent-input resize-none"
                  placeholder="Please provide a brief reason..."
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location & Time Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={14} className="text-green-600" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Location</span>
            </div>
            <p className="text-xs font-bold text-gray-700">
              {location ? 'SECURED' : 'FETCHING...'}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-orange-600" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
            </div>
            <p className={`text-xs font-bold ${lateInfo ? 'text-red-600' : 'text-green-600'}`}>
              {lateInfo ? lateInfo.toUpperCase() : 'ON TIME'}
            </p>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || !status || (!location && status === 'Yes')}
          className={`btn-fluent ${status === 'Yes' ? 'btn-green' : 'btn-orange'} shadow-md active:scale-95`}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Submit Attendance</span>
              <Send size={18} />
            </>
          )}
        </button>
      </div>

      <p className="footer">
        © {new Date().getFullYear()} SBH Hospital IT Division<br/>
        Professional DOM Automation System
      </p>
    </div>
  );
}

export default App;
