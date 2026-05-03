import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Send, 
  XCircle,
  Calendar,
  Building2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isAfter, setHours, setMinutes } from 'date-fns';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

// User's Deployed Google Apps Script URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwy3Xc0OSW8KacQhjpSuEE00FZ3rHPrPFttOQ4GE3JqIqF8P3KIYIZkO3CNEyD-G6Ip/exec';

type AttendanceStatus = 'Yes' | 'No' | 'Leave';

function App() {
  const [empData, setEmpData] = useState({
    id: '',
    name: '',
    dept: '',
  });

  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [leaveReason, setLeaveReason] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lateInfo, setLateInfo] = useState('');

  // 1. Get Employee Info from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmpData({
      id: params.get('id') || '',
      name: params.get('name') || 'Employee',
      dept: params.get('dept') || 'Department',
    });
  }, []);

  // 2. Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Fetch Location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.error(err);
          toast.error("Please enable location to mark attendance");
        }
      );
    }
  }, []);

  // 4. Calculate Late Info
  useEffect(() => {
    const tenAM = setMinutes(setHours(new Date(), 10), 0);
    if (isAfter(new Date(), tenAM)) {
      const diff = Math.floor((new Date().getTime() - tenAM.getTime()) / 60000);
      setLateInfo(`${diff} mint late`);
    } else {
      setLateInfo('');
    }
  }, [currentTime]);

  const isClosed = false; // Kept active 24h as requested
  const isAfterLimit = isAfter(new Date(), setMinutes(setHours(new Date(), 11), 0));

  const handleSubmit = async () => {
    if (!status) {
      toast.error("Please select a status");
      return;
    }
    if (!location && status !== 'Leave') {
      toast.error("Location access is required");
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
        lateRemark: lateInfo
      };

      // Submission to Google Sheets
      await axios.post(GAS_URL, JSON.stringify(payload), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      
      console.log("Submitting:", payload);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsSubmitted(true);
      toast.success("Attendance marked successfully!");
    } catch (error) {
      toast.error("Failed to mark attendance.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isClosed) {
    return (
      <div className="glass-card text-center p-12">
        <div className="bg-red-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold mb-4 text-red-400">Link Closed</h2>
        <p className="text-gray-400 text-lg">Links are active only until 01:00 PM.</p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="glass-card text-center p-12">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-green-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-2">Thank You!</h2>
        <p className="text-gray-400 text-lg">Your response has been saved.</p>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <Toaster position="top-center" />
      
      <header className="mb-10 text-center">
        <div className="flex justify-center items-center gap-2 text-indigo-400 mb-2">
          <Building2 size={24} />
          <span className="font-bold tracking-widest text-sm uppercase">SBH Hospital</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">DOM Meeting</h1>
        <p className="text-gray-400 flex justify-center items-center gap-2">
          <Calendar size={16} /> {format(new Date(), 'EEEE, do MMMM')}
        </p>
      </header>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl mb-8 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-2xl text-white">
            {empData.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-xl text-white leading-none">{empData.name}</h3>
            <p className="text-indigo-100 text-sm mt-1">{empData.dept}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-between items-center bg-white/10 p-3 rounded-xl backdrop-blur-sm">
          <span className="text-indigo-100 text-xs font-medium uppercase tracking-wider">Check-in Time</span>
          <span className="text-white font-bold tabular-nums">{format(currentTime, 'hh:mm:ss a')}</span>
        </div>
      </div>

      <div className="space-y-8">
        <div className="input-group">
          <label className="input-label text-center mb-4 block">Aap aaj DOM meeting me aaye hain?</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'Yes', label: 'Haan', icon: CheckCircle2, color: 'green', disabled: isAfterLimit },
              { id: 'No', label: 'Nahi', icon: XCircle, color: 'red', disabled: false },
              { id: 'Leave', label: 'Leave', icon: Calendar, color: 'yellow', disabled: false }
            ].map((opt) => (
              <button 
                key={opt.id}
                onClick={() => setStatus(opt.id as any)}
                disabled={opt.disabled}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  status === opt.id 
                    ? `border-${opt.color}-500 bg-${opt.color}-500/10` 
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                } ${opt.disabled ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
              >
                <opt.icon className={status === opt.id ? `text-${opt.color}-500` : 'text-gray-500'} size={24} />
                <span className="font-bold text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
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
                <label className="input-label">Wajah (Reason)</label>
                <textarea 
                  className="input-field min-h-[100px] bg-white/5 border-white/10 focus:border-indigo-500"
                  placeholder="Kyu nahi aaye? Ya leave ki wajah..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${location ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            <span className="text-sm text-gray-300 font-medium">Location Tracking</span>
          </div>
          <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">
            {location ? 'Active' : 'Fetching...'}
          </span>
        </div>

        {lateInfo && status === 'Yes' && (
          <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 flex justify-between items-center">
            <span className="text-sm text-red-400 font-bold">LATE REMARK</span>
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-md">{lateInfo.toUpperCase()}</span>
          </div>
        )}

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || !status || (!location && status === 'Yes')}
          className="btn btn-primary h-16 rounded-2xl text-lg font-bold group"
        >
          {isSubmitting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              Submit Attendance
              <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default App;
