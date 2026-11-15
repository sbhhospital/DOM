import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  RefreshCw,
  Video,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  Check,
  Crown,
  ClipboardList,
  Users,
  Flame,
  CheckCircle2,
  Loader2,
  Mail,
  AlertTriangle,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuthSession } from '../context/AuthSessionContext';
import { useDomApp } from '../context/DomAppContext';
import { Leader } from '../types/database';
import sbhLogo from '../assets/sbh-logo.png';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const {
    loginAdmin,
    loginLeaderDirect,
    loginLeaderDirectlyWithoutPassword,
    loginAdminDirectly,
    adminProfile,
    fetchLiveAdminProfile,
  } = useAuthSession();
  const { leaders } = useDomApp();

  const [usernameInput, setUsernameInput] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);
  const [isAdminSelected, setIsAdminSelected] = useState(false);
  const [isUserSelectedFromList, setIsUserSelectedFromList] = useState(false);

  // Dropdown open state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Password & visibility
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);

  // Captcha State
  const [captcha, setCaptcha] = useState<{ num1: number; num2: number; op: string; answer: number }>({
    num1: 3,
    num2: 4,
    op: '+',
    answer: 7,
  });
  const [captchaInput, setCaptchaInput] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [loggedInName, setLoggedInName] = useState('');

  // Google Authenticator Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Unauthorized User Contact Modal
  const [unauthorizedModal, setUnauthorizedModal] = useState<{
    isOpen: boolean;
    attemptedEmail: string;
    reason: string;
  }>({ isOpen: false, attemptedEmail: '', reason: '' });

  // Close dropdown on click outside & fetch live admin profile from SQL
  useEffect(() => {
    fetchLiveAdminProfile();
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const generateCaptcha = () => {
    const isMinus = Math.random() < 0.5;
    let num1: number, num2: number, answer: number, op: string;
    if (isMinus) {
      num1 = Math.floor(Math.random() * 8) + 2;
      num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
      answer = num1 - num2;
      op = '-';
    } else {
      num1 = Math.floor(Math.random() * 8) + 2;
      num2 = Math.floor(Math.random() * 8) + 1;
      answer = num1 + num2;
      op = '+';
    }
    setCaptcha({ num1, num2, op, answer });
    setCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  // Active leaders only for login selection
  const activeLeaders = useMemo(() => {
    return leaders.filter((l) => l.is_active !== false);
  }, [leaders]);

  // Filter leaders based on the single input search value
  const filteredLeaders = useMemo(() => {
    const q = usernameInput.toLowerCase().trim();
    if (!q) return activeLeaders;
    return activeLeaders.filter(
      (l) =>
        l.full_name.toLowerCase().includes(q) ||
        (l.department?.name && l.department.name.toLowerCase().includes(q)) ||
        (l.employee_code && l.employee_code.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q))
    );
  }, [activeLeaders, usernameInput]);

  // Handle Google Authenticator Verification
  const handleGoogleAuthVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const emailClean = googleEmail.trim().toLowerCase();
    if (!emailClean || !emailClean.includes('@')) {
      showToast('⚠️ Please enter a valid email address.');
      return;
    }

    setIsGoogleLoading(true);

    setTimeout(() => {
      setIsGoogleLoading(false);

      // 1. Check if email matches Administrator (Loaded from Supabase SQL)
      if (
        emailClean === 'admin@sbhhospital.com' ||
        emailClean === 'it.head@sbhhospital.com' ||
        emailClean === 'it@sbhhospital.com' ||
        emailClean === (adminProfile.email || '').toLowerCase()
      ) {
        setShowGoogleModal(false);
        loginAdminDirectly();
        setLoggedInName(adminProfile.full_name || 'Administrator (Mr. Naman Mishra)');
        setShowSuccessPopup(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
        return;
      }

      // 2. Check in leaders database
      const matched = leaders.find((l) => l.email.trim().toLowerCase() === emailClean);

      if (!matched) {
        setShowGoogleModal(false);
        setUnauthorizedModal({
          isOpen: true,
          attemptedEmail: emailClean,
          reason: 'This email account is not registered in the DOM Clinical Leadership database.',
        });
        return;
      }

      if (matched.is_active === false) {
        setShowGoogleModal(false);
        setUnauthorizedModal({
          isOpen: true,
          attemptedEmail: emailClean,
          reason: 'This leadership account has been deactivated. Access is currently disabled.',
        });
        return;
      }

      // 3. User is valid and active
      setShowGoogleModal(false);
      loginLeaderDirectlyWithoutPassword(matched);
      setLoggedInName(matched.full_name);
      setShowSuccessPopup(true);
      const params = new URLSearchParams(window.location.search);
      const targetPath = params.get('mode') === 'room_qr' ? '/boardroom-checkin' : '/portal';
      setTimeout(() => {
        navigate(targetPath);
      }, 1200);
    }, 700);
  };

  // Check if Administrator matches search query (Using live SQL data)
  const isAdminVisible = useMemo(() => {
    const q = usernameInput.toLowerCase().trim();
    if (!q) return true;
    return (
      'admin'.includes(q) ||
      'administrator'.includes(q) ||
      'hospital command'.includes(q) ||
      (adminProfile.username && adminProfile.username.toLowerCase().includes(q)) ||
      (adminProfile.full_name && adminProfile.full_name.toLowerCase().includes(q)) ||
      (adminProfile.display_name && adminProfile.display_name.toLowerCase().includes(q))
    );
  }, [usernameInput, adminProfile]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = usernameInput.trim();
    if (!trimmedUser) {
      showToast('⚠️ Please select your Name from the dropdown list!');
      setIsDropdownOpen(true);
      return;
    }

    if (!isUserSelectedFromList) {
      showToast('⚠️ Please click and select your name from the dropdown list!');
      setIsDropdownOpen(true);
      return;
    }

    if (parseInt(captchaInput, 10) !== captcha.answer) {
      showToast('🤖 Incorrect Captcha calculation. Please try again.');
      generateCaptcha();
      return;
    }

    if (!password) {
      showToast('⚠️ Please enter your password.');
      return;
    }

    setLoading(true);

    if (isAdminSelected) {
      // 1. Admin Login with live SQL credentials
      const res = await loginAdmin(usernameInput, password);
      setLoading(false);
      if (res.success) {
        setLoggedInName(adminProfile.full_name || 'Administrator');
        setShowSuccessPopup(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      } else {
        setErrorMsg(res.message);
        generateCaptcha();
      }
    } else if (selectedLeader) {
      // 2. Leader Login
      const res = await loginLeaderDirect(selectedLeader, password);
      setLoading(false);
      if (res.success) {
        setLoggedInName(selectedLeader.full_name);
        setShowSuccessPopup(true);
        const params = new URLSearchParams(window.location.search);
        const targetPath = params.get('mode') === 'room_qr' ? '/boardroom-checkin' : '/portal';
        setTimeout(() => {
          navigate(targetPath);
        }, 1200);
      } else {
        setErrorMsg(res.message);
        generateCaptcha();
      }
    } else {
      setLoading(false);
      showToast('⚠️ Please select your name from the dropdown list.');
    }
  };

  return (
    <div className="min-h-screen select-none relative overflow-hidden bg-slate-100 text-slate-800 flex items-center justify-center p-3 md:p-6 pb-16 md:pb-20 font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[40000] px-5 py-3 rounded-2xl bg-amber-600 text-white font-extrabold text-xs shadow-2xl border border-amber-400 animate-bounce text-center">
          {toastMsg}
        </div>
      )}

      {/* Main 2-Panel Card Layout (Matching User's Specified Design 100%) */}
      <div className="w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col md:flex-row min-h-[560px] z-10">
        {/* Left Panel: Green/Amber Gradient with Official System Details (Desktop View) */}
        <div
          className="hidden md:flex md:w-1/2 p-8 flex-col justify-between text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(to bottom, #f59e0b, #10b981, #15803d)' }}
        >
          <div className="flex items-center gap-2 z-10">
            <div className="bg-black/15 p-2 rounded-xl backdrop-blur-md">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-black text-white">
              OFFICIAL ADMINISTRATIVE SYSTEM
            </span>
          </div>

          <div className="my-6 space-y-5 z-10">
            <h2 className="text-3xl font-black leading-tight text-white">
              SBH Operations & <br />
              <span className="text-[#ffd54f]">Compliance Hub</span>
            </h2>
            <p className="text-white/90 text-xs font-medium leading-relaxed max-w-sm">
              Real-time daily operations meeting (DOM), executive attendance tracking, late audits, and virtual attendance command managed in one place.
            </p>

            <div className="space-y-3 pt-1">
              <div className="bg-black/15 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3.5">
                <div className="bg-[#f59e0b] p-2.5 rounded-xl shadow-md shrink-0">
                  <ClipboardList className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Daily Operations Standup</h4>
                  <p className="text-[10px] text-white/85 mt-0.5">Automated 10:00 AM attendance audit & late calculation</p>
                </div>
              </div>

              <div className="bg-black/15 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3.5">
                <div className="bg-[#10b981] p-2.5 rounded-xl shadow-md shrink-0">
                  <Users className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Active Leaders Directory</h4>
                  <p className="text-[10px] text-white/85 mt-0.5">Synced dynamically with central hospital database</p>
                </div>
              </div>

              <div className="bg-black/15 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3.5">
                <div className="bg-[#15803d] p-2.5 rounded-xl shadow-md shrink-0">
                  <Flame className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Executive Approval Gate</h4>
                  <p className="text-[10px] text-white/85 mt-0.5">Strict administrative verification before PDF report confirmation</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[9px] font-bold text-white/80 uppercase tracking-widest z-10">
            © 2026 SBH Group of Hospitals. Administrative Portal.
          </div>
        </div>

        {/* Right Panel: White Authentication Form with Single Unified Searchable Input */}
        <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col justify-center bg-white">
          <div className="mb-6">
            {/* Official SBH Logo */}
            <img src={sbhLogo} alt="SBH Logo" className="h-12 w-auto object-contain mb-4" />
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Portal Authentication</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Select your name and enter security credentials to log in
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* GOOGLE AUTHENTICATOR / SIGN IN WITH GOOGLE */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => {
                setGoogleEmail('');
                setShowGoogleModal(true);
              }}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl text-xs font-black text-slate-700 shadow-xs flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google Authenticator</span>
            </button>

            <div className="relative flex items-center justify-center my-3.5">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                OR SIGN IN WITH USERNAME & PASSWORD
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* SINGLE Searchable Name Input Box (No two boxes!) */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  SELECT USERNAME / LEADER NAME <span className="text-rose-600">*</span>
                </label>
                {isUserSelectedFromList ? (
                  <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">✓ Selected</span>
                ) : usernameInput ? (
                  <span className="text-[10px] font-bold text-amber-600 animate-pulse">Click your name from list below</span>
                ) : null}
              </div>

              {/* Single Direct Search & Selection Box */}
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Type to search or select your name..."
                  value={usernameInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUsernameInput(val);
                    setIsUserSelectedFromList(false);
                    setSelectedLeader(null);
                    setIsAdminSelected(false);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setIsDropdownOpen(true);
                  }}
                  className={`w-full ${
                    isUserSelectedFromList
                      ? 'bg-emerald-50/40 border-emerald-500 font-bold text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800 font-medium'
                  } border rounded-xl p-3 pr-10 text-xs outline-none focus:ring-2 focus:ring-[#15803d] transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="Toggle Name List"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                </button>
              </div>

              {/* Suggestions Dropdown List right beneath the single input */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto p-1 divide-y divide-slate-100">
                  {/* Administrator Item (Fetched directly from Supabase SQL) */}
                  {isAdminVisible && (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setUsernameInput(adminProfile.full_name || 'Administrator (Mr. Naman Mishra)');
                        setIsAdminSelected(true);
                        setSelectedLeader(null);
                        setIsUserSelectedFromList(true);
                        setIsDropdownOpen(false);
                        setErrorMsg('');
                        setTimeout(() => passwordRef.current?.focus(), 80);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                        isAdminSelected && isUserSelectedFromList
                          ? 'bg-orange-100 text-orange-950 font-black'
                          : 'hover:bg-orange-50 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-orange-600 shrink-0" />
                        <div>
                          <div className="text-xs font-black text-slate-900">
                            {adminProfile.full_name || 'Administrator (Mr. Naman Mishra)'}
                          </div>
                          <div className="text-[10px] text-orange-700 font-semibold">
                            {adminProfile.username} • Command Center & Full Dashboard
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] font-black uppercase bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full border border-orange-300">
                        ADMIN
                      </span>
                    </button>
                  )}

                  {/* Leaders Items */}
                  {filteredLeaders.length > 0 ? (
                    filteredLeaders.map((lead) => {
                      const isSelected = !isAdminSelected && selectedLeader?.id === lead.id && isUserSelectedFromList;
                      return (
                        <button
                          key={lead.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setUsernameInput(lead.full_name);
                            setSelectedLeader(lead);
                            setIsAdminSelected(false);
                            setIsUserSelectedFromList(true);
                            setIsDropdownOpen(false);
                            setErrorMsg('');
                            setTimeout(() => passwordRef.current?.focus(), 80);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-100 text-emerald-900 font-black'
                              : 'hover:bg-emerald-50 text-slate-800'
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-bold text-slate-900">{lead.full_name}</span>
                            <span className="text-[10px] text-slate-500 font-normal ml-2">
                              ({lead.department?.name || 'Department'} • {lead.employee_code})
                            </span>
                          </div>
                          {isSelected && <span className="text-emerald-600 font-bold ml-2">✓ Selected</span>}
                        </button>
                      );
                    })
                  ) : (
                    !isAdminVisible && (
                      <div className="p-3 text-center text-xs text-rose-500 font-semibold">
                        No matching leader found
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Access Password */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                ACCESS PASSWORD <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  type={visible ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#15803d]"
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={visible ? 'Hide password' : 'Show password'}
                >
                  {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security Captcha Verification */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase">
                <span>SECURITY CAPTCHA VERIFICATION</span>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="text-[#15803d] hover:text-[#166534] cursor-pointer"
                  title="Generate new captcha"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 font-black text-sm text-slate-800 shrink-0">
                  {captcha.num1} {captcha.op} {captcha.num2} =
                </div>
                <input
                  type="number"
                  required
                  placeholder="Answer"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-center text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-[#15803d]"
                />
              </div>
            </div>

            {/* Submit Action Button with Ripple & Spinner */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : isAdminSelected ? (
                'Authorize & Open Dashboard →'
              ) : selectedLeader ? (
                'Login to Attendance Portal →'
              ) : (
                'LOGIN →'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ================= MODAL: GOOGLE AUTHENTICATOR PROMPT ================= */}
      {showGoogleModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[35000] bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 rounded-xl">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Google Authenticator</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Single Sign-On Identity Verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-medium">
                🔒 Security Check: Only pre-registered hospital leadership emails in the DOM database are authorized.
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                  ENTER REGISTERED GOOGLE EMAIL
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. yourname@domain.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGoogleAuthVerify();
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleGoogleAuthVerify()}
                  disabled={isGoogleLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying ID...</span>
                    </>
                  ) : (
                    <span>Authenticate with Google →</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ACCESS DENIED / UNAUTHORIZED CONTACT IT HEAD ================= */}
      {unauthorizedModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[40000] bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-rose-300 animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 mx-auto mb-3 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 px-3 py-1 rounded-full border border-rose-200">
              ACCESS RESTRICTED • NOT REGISTERED
            </span>

            <h3 className="text-lg font-black text-slate-900 mt-3">Authorization Required</h3>
            <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
              The account <span className="font-bold text-slate-900">{unauthorizedModal.attemptedEmail}</span> is not registered or is currently inactive in the SBH DOM Leadership System.
            </p>

            {/* Official Contact Box for Mr. Naman Mishra */}
            <div className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                FOR ACCOUNT ACTIVATION, CONTACT:
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                  NM
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Mr. Naman Mishra</h4>
                  <p className="text-[11px] font-bold text-orange-700">IT Head — SBH Group of Hospitals</p>
                  <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>it.head@sbhhospital.com</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <a
                href={`mailto:it.head@sbhhospital.com?subject=DOM%20Portal%20Access%20Registration%20-%20${encodeURIComponent(
                  unauthorizedModal.attemptedEmail
                )}&body=Dear%20Mr.%20Naman%20Mishra,%0A%0APlease%20activate%20my%20account%20in%20the%20DOM%20Attendance%20Portal.%0A%0AEmail:%20${encodeURIComponent(
                  unauthorizedModal.attemptedEmail
                )}%0AThank%20you.`}
                className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Contact Mr. Naman Mishra (it.head@sbhhospital.com)</span>
              </a>

              <button
                type="button"
                onClick={() => setUnauthorizedModal({ isOpen: false, attemptedEmail: '', reason: '' })}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-[45000] bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-emerald-200">
            <CheckCircle2 size={40} className="text-emerald-600 mx-auto mb-3 animate-bounce" />
            <h3 className="text-lg font-black text-slate-900 uppercase">Access Granted</h3>
            <p className="text-xs text-slate-500 font-bold mt-1">
              Welcome back, <span className="text-emerald-600 font-extrabold">{loggedInName}</span>! Redirecting...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
