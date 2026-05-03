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
  PartyPopper
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
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Toaster position="top-center" />
      
      {/* Success Modal */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <PartyPopper className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Submitted!</h2>
              <p className="text-gray-500 mb-8">Thank you, {empData.name}. Your attendance has been safely recorded.</p>
              <button 
                onClick={() => window.close()}
                className="btn-fluent btn-green w-full"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fluent-card w-full max-w-md">
        <header className="fluent-header text-center">
          <div className="flex justify-center items-center gap-2 text-green-600 mb-4">
            <Building2 size={32} />
            <span className="font-bold tracking-tighter text-2xl uppercase">SBH HOSPITAL</span>
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-orange-700 rounded-full border border-orange-100 mb-6">
            <Clock size={16} />
            <span className="text-sm font-bold tabular-nums">
              {format(currentTime, 'hh:mm:ss a')}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">{empData.meetingType}</h1>
            <p className="text-gray-500 text-sm font-medium flex items-center justify-center gap-1.5">
              <Calendar size={14} /> {format(new Date(), 'EEEE, MMMM do')}
            </p>
          </div>
        </header>

        {/* User Identity Card */}
        <div className="relative group mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-orange-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white border border-gray-100 rounded-2xl p-6 flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <User size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-1">Employee Profile</p>
              <h3 className="text-xl font-bold text-gray-900 leading-tight">{empData.name}</h3>
              <p className="text-gray-500 text-sm font-medium">{empData.dept}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="input-group">
            <label className="input-label">Aap aaj DOM meeting me aaye hain?</label>
            <select 
              className="fluent-select font-bold"
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            >
              <option value="" disabled>Select Response...</option>
              <option value="Yes">Haan (Present)</option>
              <option value="No">Nahi (Absent)</option>
              <option value="Leave">On Leave</option>
            </select>
          </div>

          <AnimatePresence>
            {(status === 'No' || status === 'Leave') && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="input-group">
                  <label className="input-label">Kyu nahi aaye? (Reason)</label>
                  <textarea 
                    className="fluent-input font-medium"
                    placeholder="Wajah likhein..."
                    rows={3}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <MapPin size={20} className="text-green-600" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Location</p>
                <p className="text-xs font-black text-gray-700">{location ? 'SECURED' : 'FETCHING...'}</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${lateInfo ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <ShieldCheck size={20} className={lateInfo ? 'text-red-600' : 'text-green-600'} />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Status</p>
                <p className={`text-xs font-black ${lateInfo ? 'text-red-600' : 'text-green-600'}`}>
                  {lateInfo ? lateInfo.toUpperCase() : 'ON TIME'}
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !status || (!location && status === 'Yes')}
            className={`btn-fluent ${status === 'Yes' ? 'btn-green' : 'btn-orange'} h-16 rounded-2xl text-lg group active:scale-95 transition-all shadow-xl shadow-green-900/10`}
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <span>Submit Response</span>
                <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </>
            )}
          </button>
        </div>

        <footer className="footer mt-10">
          <div className="flex justify-center gap-4 opacity-50 mb-4">
             <ShieldCheck size={20} />
             <MapPin size={20} />
             <Clock size={20} />
          </div>
          <p>© {new Date().getFullYear()} SBH HOSPITAL IT DIVISION</p>
          <p className="font-black tracking-widest mt-1">SECURE DOM AUTOMATION</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
