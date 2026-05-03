import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isAfter, setHours, setMinutes } from 'date-fns';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwy3Xc0OSW8KacQhjpSuEE00FZ3rHPrPFttOQ4GE3JqIqF8P3KIYIZkO3CNEyD-G6Ip/exec';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  empName: string;
}

const SuccessModal = ({ isOpen, onClose, empName }: SuccessModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100"
      >
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-100">
          <CheckCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Success!</h3>
        <p className="text-sm text-slate-500 mb-6">
          Attendance submitted successfully for <span className="font-bold">{empName}</span>.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
};

export default function AttendanceForm() {
  const [empData, setEmpData] = useState({
    id: '',
    name: 'EMPLOYEE',
    dept: 'GENERAL DEPARTMENT',
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
      dept: (params.get('dept') || 'GENERAL DEPARTMENT').toUpperCase(),
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
      setLateInfo(`${diff} min late`);
    }
  }, []);

  const handleSubmit = async () => {
    if (status === 'Leave' && !reason) {
      toast.error("Please provide a reason.");
      return;
    }
    if (status === 'Yes' && !location) {
      toast.error("Location not verified.");
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
      toast.error("Failed to submit.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    window.close();
    setTimeout(() => { window.location.href = "https://itsbhhospital.com"; }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-200 p-6 space-y-6 animate-in fade-in zoom-in duration-500">

        {/* HEADER */}
        <div className="text-center">
          <img
            src="/logo.jpg"
            alt="SBH Hospital"
            className="h-10 mx-auto mb-3 object-contain"
          />
          <h2 className="text-lg font-bold text-slate-900 uppercase">
            {empData.meetingType}
          </h2>
          <p className="text-sm text-slate-500">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>

        {/* EMPLOYEE INFO */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Employee Info</p>
          <p className="text-sm font-bold text-slate-900">{empData.name}</p>
          <p className="text-xs text-slate-500">{empData.dept}</p>
        </div>

        {/* ATTENDANCE SELECTION */}
        <div>
          <label className="text-sm font-medium text-slate-600">Response Status</label>
          <select 
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Yes">Present (At Meeting)</option>
            <option value="Leave">Official Leave</option>
          </select>
        </div>

        <AnimatePresence>
          {status === 'Leave' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <div>
                <label className="text-sm font-medium text-slate-600">Leave Type</label>
                <select 
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <option>Official Leave</option>
                  <option>Sick Leave</option>
                  <option>Casual Leave</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Leave Reason</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe your reason..."
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STATUS GRID */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Geolocation</p>
            <p className={`text-sm font-bold ${location ? 'text-emerald-600' : 'text-slate-400'}`}>
              {location ? 'Verified ✅' : 'Locating...'}
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Punctuality</p>
            <p className={`text-sm font-bold ${lateInfo ? 'text-red-500' : 'text-emerald-600'}`}>
              {lateInfo ? `${lateInfo} ⚠️` : 'On Time ✅'}
            </p>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={loading || (status === 'Yes' && !location)}
          className="w-full py-3 rounded-lg text-white font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit Attendance 🚀"}
        </button>

      </div>

      <SuccessModal
        isOpen={isSubmitted}
        onClose={handleClose}
        empName={empData.name}
      />
    </div>
  );
}
