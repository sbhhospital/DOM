import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  ChevronRight,
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
  Copy,
} from 'lucide-react';
import { useAuthSession } from '../context/AuthSessionContext';
import { useDomApp } from '../context/DomAppContext';
import { INITIAL_LEADERS } from '../data/hospitalLeadersData';
import { supabase } from '../lib/supabase';
import { Leader } from '../types/database';
import defaultLeaderAvatar from '../assets/default-leader-avatar.png';
import sbhLogo from '../assets/sbh-logo.png';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const {
    loginAdmin,
    loginLeaderDirect,
    loginLeaderDirectlyWithoutPassword,
    loginAdminDirectly,
    logoutAdmin,
    adminProfile,
    fetchLiveAdminProfile,
  } = useAuthSession();
  const { leaders } = useDomApp();

  // Always seed with initial leaders so dropdown is NEVER empty on first render
  const [dbLeaders, setDbLeaders] = useState<Leader[]>(() => {
    return leaders && leaders.length > 0 ? leaders : INITIAL_LEADERS;
  });

  // Direct fetch from Supabase on mount
  useEffect(() => {
    const fetchDirect = async () => {
      try {
        const { data, error } = await supabase
          .from('leaders')
          .select('*')
          .order('full_name', { ascending: true });
        if (!error && data && data.length > 0) {
          setDbLeaders(data as Leader[]);
        }
      } catch (e) {
        console.warn('Direct leader fetch error:', e);
      }
    };
    fetchDirect();
  }, []);

  // Sync if context updates
  useEffect(() => {
    if (leaders && leaders.length > 0) {
      setDbLeaders(leaders);
    }
  }, [leaders]);

  const [usernameInput, setUsernameInput] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);
  const [isAdminSelected, setIsAdminSelected] = useState(false);
  const [isUserSelectedFromList, setIsUserSelectedFromList] = useState(false);

  // Persistent Device Recognition for Department Leaders
  const [rememberedLeader, setRememberedLeader] = useState<Leader | null>(() => {
    const saved = localStorage.getItem('sbh_device_remembered_leader');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const getTargetRedirectPath = () => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || sessionStorage.getItem('sbh_redirect_after_login');
    if (redirect) {
      sessionStorage.removeItem('sbh_redirect_after_login');
      return redirect;
    }
    return params.get('mode') === 'room_qr' ? '/boardroom-checkin' : '/portal';
  };

  const handleQuickContinueAsRemembered = (leader: Leader) => {
    loginLeaderDirectlyWithoutPassword(leader);
    setLoggedInName(leader.full_name);
    setShowSuccessPopup(true);
    const targetPath = getTargetRedirectPath();
    setTimeout(() => {
      navigate(targetPath);
    }, 1000);
  };

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

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  }, []);

  // Google Authenticator States
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleProviderSetupModal, setShowGoogleProviderSetupModal] = useState(false);

  // Unauthorized User Contact Modal (Mr. Naman Mishra, Web Administrator)
  const [unauthorizedModal, setUnauthorizedModal] = useState<{
    isOpen: boolean;
    attemptedEmail: string;
    reason: string;
  }>({ isOpen: false, attemptedEmail: '', reason: '' });

  // Handle Browser Back Button / Cancel / BFCache restoration so button never stays spinning
  useEffect(() => {
    const handleNavigationRestore = () => {
      setIsGoogleLoading(false);

      const isAuthCallback =
        window.location.hash.includes('access_token') ||
        window.location.search.includes('code=') ||
        window.location.search.includes('error=');

      if (!isAuthCallback && sessionStorage.getItem('sbh_google_auth_in_progress')) {
        sessionStorage.removeItem('sbh_google_auth_in_progress');
        showToast('⚠️ Google Sign-In cancelled.');
      }
    };

    // Fired when returning via browser Back / Forward buttons (including bfcache)
    window.addEventListener('pageshow', handleNavigationRestore);
    // Fired when tab regains focus (e.g. user navigated back or switched back from cancelled page)
    window.addEventListener('focus', handleNavigationRestore);
    // Fired on history navigation
    window.addEventListener('popstate', handleNavigationRestore);

    // Initial check on mount
    handleNavigationRestore();

    return () => {
      window.removeEventListener('pageshow', handleNavigationRestore);
      window.removeEventListener('focus', handleNavigationRestore);
      window.removeEventListener('popstate', handleNavigationRestore);
    };
  }, [showToast]);

  // Listen for real Google OAuth Callback from Supabase / Browser session (Initialized once on mount)
  useEffect(() => {
    const checkRealGoogleAuthSession = async () => {
      try {
        // Detect OAuth error returned in URL query or hash
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        if (params.get('error') || params.get('error_code') || hash.includes('error=')) {
          setIsGoogleLoading(false);
          sessionStorage.removeItem('sbh_google_auth_in_progress');
          if (params.get('error_code') === 'unsupported_provider' || hash.includes('unsupported_provider')) {
            setShowGoogleProviderSetupModal(true);
          } else {
            showToast('Google Sign-In note: Provider verification required in database settings.');
          }
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.email) {
          sessionStorage.removeItem('sbh_google_auth_in_progress');
          setIsGoogleLoading(false);
          const userEmail = session.user.email.toLowerCase().trim();
          handleVerifyGoogleEmail(userEmail);
        }
      } catch (err) {
        console.warn('Google session check notice:', err);
      }
    };

    checkRealGoogleAuthSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email) {
        sessionStorage.removeItem('sbh_google_auth_in_progress');
        setIsGoogleLoading(false);
        const userEmail = session.user.email.toLowerCase().trim();
        handleVerifyGoogleEmail(userEmail);
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      subscription.unsubscribe();
    };
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

  // Active leaders only for login selection (using dbLeaders fallback)
  const activeLeaders = useMemo(() => {
    const list = dbLeaders && dbLeaders.length > 0 ? dbLeaders : leaders;
    return list.filter((l) => l.is_active !== false);
  }, [dbLeaders, leaders]);

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

  // Verify Real Google Account against Hospital Leadership Database
  const handleVerifyGoogleEmail = async (emailClean: string) => {
    setIsGoogleLoading(false);
    sessionStorage.removeItem('sbh_google_auth_in_progress');

    const email = (emailClean || '').trim().toLowerCase();
    if (!email) return;

    // 1. Fetch fresh leaders from Supabase to guarantee 100% accurate match
    let leaderList = dbLeaders && dbLeaders.length > 0 ? dbLeaders : leaders;
    try {
      const { data: supaLeaders } = await supabase.from('leaders').select('*');
      if (supaLeaders && supaLeaders.length > 0) {
        leaderList = supaLeaders as Leader[];
        setDbLeaders(leaderList);
      }
    } catch (e) {
      console.warn('Error refreshing leaders for Google Auth:', e);
    }

    const matched = leaderList.find((l) => l.email && l.email.trim().toLowerCase() === email);

    // If user is a registered leader in the database, log them in as a LEADER (not admin!)
    if (matched) {
      if (matched.is_active === false) {
        try {
          await supabase.auth.signOut();
        } catch (e) {}
        setUnauthorizedModal({
          isOpen: true,
          attemptedEmail: email,
          reason: 'This leadership account has been deactivated. Access is currently disabled.',
        });
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Explicitly clear any existing admin session so user is strictly a Department Leader
      logoutAdmin();
      loginLeaderDirectlyWithoutPassword(matched);
      localStorage.setItem('sbh_device_remembered_leader', JSON.stringify(matched));
      setLoggedInName(matched.full_name);
      setShowSuccessPopup(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      const targetPath = getTargetRedirectPath();
      setTimeout(() => {
        navigate(targetPath);
      }, 1000);
      return;
    }

    // 2. ONLY if NOT a leader in roster, check if it's the designated super-administrator
    const currentAdmin = await fetchLiveAdminProfile();
    const adminEmail = (currentAdmin?.email || 'admin@sbhhospital.com').trim().toLowerCase();

    if (email === adminEmail || email === 'admin@sbhhospital.com') {
      loginAdminDirectly();
      setLoggedInName(currentAdmin?.full_name || 'Administrator');
      setShowSuccessPopup(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
      return;
    }

    // 3. User is not registered in system
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUnauthorizedModal({
      isOpen: true,
      attemptedEmail: email,
      reason: 'This Google account is not registered in the DOM Clinical Leadership database.',
    });
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Launch Real Google Login / OAuth flow
  const handleLaunchRealGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    sessionStorage.setItem('sbh_google_auth_in_progress', '1');

    // Auto-timeout safeguard: never let button spin indefinitely (stops after 12s if user is still on page)
    const timeoutId = window.setTimeout(() => {
      setIsGoogleLoading(false);
      sessionStorage.removeItem('sbh_google_auth_in_progress');
    }, 12000);

    try {
      const redirectOrigin = window.location.origin;

      // 1. Trigger Supabase Google OAuth (Generates real Google Account OAuth authorization URL)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectOrigin}/login`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (!error && data?.url) {
        // Redirect browser directly to Google's official permission screen
        window.location.href = data.url;
        return;
      }

      if (error) {
        clearTimeout(timeoutId);
        setIsGoogleLoading(false);
        sessionStorage.removeItem('sbh_google_auth_in_progress');
        console.warn('Supabase Google OAuth status:', error.message);
        setShowGoogleProviderSetupModal(true);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setIsGoogleLoading(false);
      sessionStorage.removeItem('sbh_google_auth_in_progress');
      console.warn('Google sign in note:', err);
      setShowGoogleProviderSetupModal(true);
    }
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = usernameInput.trim();
    if (!trimmedUser) {
      showToast('⚠️ Please select or type your Name / Email from the list!');
      setIsDropdownOpen(true);
      return;
    }

    let activeAdminSelected = isAdminSelected;
    let activeLeaderSelected = selectedLeader;

    if (!isUserSelectedFromList) {
      const q = trimmedUser.toLowerCase();
      const adminMatch =
        (adminProfile.username && adminProfile.username.toLowerCase() === q) ||
        (adminProfile.email && adminProfile.email.toLowerCase() === q) ||
        (adminProfile.full_name && adminProfile.full_name.toLowerCase() === q) ||
        q === 'admin' ||
        q === 'administrator';

      if (adminMatch) {
        activeAdminSelected = true;
        setIsAdminSelected(true);
        setIsUserSelectedFromList(true);
      } else {
        const found =
          activeLeaders.find(
            (l) =>
              l.full_name.toLowerCase() === q ||
              (l.email && l.email.toLowerCase() === q)
          ) ||
          activeLeaders.find((l) => l.full_name.toLowerCase().includes(q));

        if (found) {
          activeLeaderSelected = found;
          setSelectedLeader(found);
          setIsUserSelectedFromList(true);
        } else {
          showToast('⚠️ Please select or type your registered Name or Email from the list!');
          setIsDropdownOpen(true);
          return;
        }
      }
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

    if (activeAdminSelected) {
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
    } else if (activeLeaderSelected) {
      // 2. Leader Login
      const res = await loginLeaderDirect(activeLeaderSelected, password);
      setLoading(false);
      if (res.success) {
        localStorage.setItem('sbh_device_remembered_leader', JSON.stringify(activeLeaderSelected));
        setLoggedInName(activeLeaderSelected.full_name);
        setShowSuccessPopup(true);
        const targetPath = getTargetRedirectPath();
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
    <div className="min-h-screen select-none relative overflow-hidden bg-gradient-to-br from-[#f4f5fa] via-[#f4f5fa] to-[#f4f5fa] text-slate-800 flex items-center justify-center p-3 md:p-6 pb-16 md:pb-20 font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[40000] px-5 py-3 rounded-2xl bg-gradient-to-r from-[#7065f0] to-[#7f70f6] text-white font-extrabold text-xs shadow-2xl border border-purple-300 animate-bounce text-center">
          {toastMsg}
        </div>
      )}

      {/* Main 2-Panel Card Layout (Matching User's Specified SaaS Lavender Theme) */}
      <div className="w-full max-w-5xl bg-white rounded-[32px] overflow-hidden shadow-2xl shadow-indigo-200/50 border border-[#f0f1f8] flex flex-col md:flex-row min-h-[560px] z-10">
        {/* Left Panel: SaaS Lavender/Purple Gradient with Official System Details (Desktop View) */}
        <div
          className="hidden md:flex md:w-1/2 p-8 flex-col justify-between text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7065f0 0%, #7065f0 50%, #8577ff 100%)' }}
        >
          <div className="flex items-center gap-2 z-10">
            <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-md">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-black text-white/90">
              OFFICIAL ADMINISTRATIVE SYSTEM
            </span>
          </div>

          <div className="my-6 space-y-5 z-10">
            <h2 className="text-3xl font-black leading-tight text-white">
              SBH Operations & <br />
              <span className="text-[#fed7aa]">Compliance Hub</span>
            </h2>
            <p className="text-white/90 text-xs font-medium leading-relaxed max-w-sm">
              Real-time daily operations meeting (DOM), executive attendance tracking, late audits, and virtual attendance command managed in one place.
            </p>

            <div className="space-y-3 pt-1">
              <div className="bg-white/15 border border-white/20 rounded-2xl p-3.5 flex items-center gap-3.5">
                <div className="bg-white/25 p-2.5 rounded-xl shadow-xs shrink-0">
                  <ClipboardList className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Daily Operations Standup</h4>
                  <p className="text-[10px] text-white/85 mt-0.5">Automated 10:00 AM attendance audit & late calculation</p>
                </div>
              </div>

              <div className="bg-white/15 border border-white/20 rounded-2xl p-3.5 flex items-center gap-3.5">
                <div className="bg-white/25 p-2.5 rounded-xl shadow-xs shrink-0">
                  <Users className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Active Leaders Directory</h4>
                  <p className="text-[10px] text-white/85 mt-0.5">Synced dynamically with central hospital database</p>
                </div>
              </div>

              <div className="bg-white/15 border border-white/20 rounded-2xl p-3.5 flex items-center gap-3.5">
                <div className="bg-white/25 p-2.5 rounded-xl shadow-xs shrink-0">
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
            <h3 className="text-2xl font-black text-[#232d42] tracking-tight">Portal Authentication</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Select your name and enter security credentials to log in
            </p>
          </div>

          {/* Boardroom QR Scan Verification Prompt */}
          {(new URLSearchParams(window.location.search).get('redirect') === '/boardroom-checkin' ||
            (typeof window !== 'undefined' && sessionStorage.getItem('sbh_redirect_after_login') === '/boardroom-checkin')) && (
            <div className="mb-4 p-3.5 bg-[#eff0fe] border border-purple-200 text-[#7065f0] rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
              <ShieldCheck className="w-4 h-4 text-[#7065f0] shrink-0" />
              <span>Boardroom QR Scanned! Please log in to confirm your physical presence in Conference Room (5th Floor).</span>
            </div>
          )}

          {/* Recognized Device 1-Click Fast Check-in */}
          {rememberedLeader && (
            <div className="mb-5 p-3.5 bg-gradient-to-r from-[#f5f3ff] via-[#eff0fe]/40 to-[#e0e7ff]/30 border border-purple-200/80 rounded-2xl shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={defaultLeaderAvatar}
                    alt={rememberedLeader.full_name}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-purple-200/80 shadow-2xs"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-[#232d42] truncate flex items-center gap-1.5">
                      <span>Device Recognized:</span>
                      <span className="text-[#7065f0]">{rememberedLeader.full_name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium truncate">
                      {rememberedLeader.department?.name || 'Department Leader'} • Today's Check-in Ready
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickContinueAsRemembered(rememberedLeader)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-[#7065f0] to-[#7f70f6] hover:from-[#513ed8] hover:to-[#7065f0] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                  title="1-Click fast login with remembered credentials"
                >
                  Continue ➔
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* SINGLE Searchable Name Input Box (No two boxes!) */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  SELECT USERNAME / LEADER NAME <span className="text-rose-600">*</span>
                </label>
                {isUserSelectedFromList ? (
                  <span className="text-[10px] font-black text-[#7065f0] flex items-center gap-1">✓ Selected</span>
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
                      ? 'bg-[#eff0fe]/30 border-[#7065f0] font-bold text-[#232d42]'
                      : 'bg-[#f8f6fe]/70 border-[#f0f1f8] text-[#232d42] font-medium'
                  } border rounded-2xl p-3 pr-10 text-xs outline-none focus:ring-2 focus:ring-[#7065f0] focus:border-[#7065f0] transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="Toggle Name List"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#7065f0]' : ''}`} />
                </button>
              </div>

              {/* Suggestions Dropdown List right beneath the single input */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-[#f0f1f8] rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 divide-y divide-purple-50">
                  {/* Administrator Item (Fetched directly from Supabase SQL table) */}
                  {isAdminVisible && (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setUsernameInput(adminProfile.full_name || 'Administrator');
                        setIsAdminSelected(true);
                        setSelectedLeader(null);
                        setIsUserSelectedFromList(true);
                        setIsDropdownOpen(false);
                        setErrorMsg('');
                        setTimeout(() => passwordRef.current?.focus(), 80);
                      }}
                      className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer border-b border-[#f0f1f8] ${
                        isAdminSelected && isUserSelectedFromList
                          ? 'bg-[#eff0fe] text-[#7065f0] font-black'
                          : 'hover:bg-[#eff0fe]/40 text-[#232d42]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-black text-[#232d42]">
                          {adminProfile.full_name || 'Administrator'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {adminProfile.username || 'admin'} • Command Center & Full Dashboard
                        </div>
                      </div>
                      {isAdminSelected && isUserSelectedFromList && (
                        <span className="text-[#7065f0] font-bold text-xs">✓ Selected</span>
                      )}
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
                          className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#eff0fe] text-[#7065f0] font-black'
                              : 'hover:bg-[#eff0fe]/30 text-slate-800'
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-bold text-slate-900">{lead.full_name}</span>
                            {lead.department?.name && (
                              <span className="text-[10px] text-slate-500 font-normal ml-2">
                                ({lead.department.name})
                              </span>
                            )}
                          </div>
                          {isSelected && <span className="text-[#7065f0] font-bold ml-2">✓ Selected</span>}
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
                  className="w-full bg-[#f8f6fe]/70 border border-[#f0f1f8] rounded-2xl p-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#7065f0] focus:border-[#7065f0]"
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
            <div className="bg-[#f8f6fe]/70 p-3.5 rounded-2xl border border-[#f0f1f8] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase">
                <span>SECURITY CAPTCHA VERIFICATION</span>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="text-[#7065f0] hover:text-[#4f42dc] cursor-pointer"
                  title="Generate new captcha"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white px-4 py-2 rounded-xl border border-[#f0f1f8] font-black text-sm text-[#232d42] shrink-0">
                  {captcha.num1} {captcha.op} {captcha.num2} =
                </div>
                <input
                  type="number"
                  required
                  placeholder="Answer"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="w-full bg-white border border-[#f0f1f8] rounded-2xl p-2 text-center text-sm font-black text-[#232d42] outline-none focus:ring-2 focus:ring-[#7065f0]"
                />
              </div>
            </div>

            {/* Submit Action Button with Ripple & Spinner */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#7065f0] to-[#7f70f6] hover:from-[#513ed8] hover:to-[#7065f0] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-300/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : isAdminSelected ? (
                <span className="flex items-center justify-center gap-2">
                  <img
                    src="/images/icons/submit-check.png"
                    alt="Submit"
                    className="w-4 h-4 object-contain brightness-0 invert"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span>Authorize & Open Dashboard →</span>
                </span>
              ) : selectedLeader ? (
                <span className="flex items-center justify-center gap-2">
                  <img
                    src="/images/icons/submit-check.png"
                    alt="Submit"
                    className="w-4 h-4 object-contain brightness-0 invert"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span>Login to Attendance Portal →</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <img
                    src="/images/icons/submit-check.png"
                    alt="Submit"
                    className="w-4 h-4 object-contain brightness-0 invert"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span>LOGIN →</span>
                </span>
              )}
            </button>
          </form>

          {/* Clean Single-Line Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-[#f0f1f8] w-full" />
            <span className="bg-white px-3 text-[10px] font-black uppercase text-slate-400 tracking-wider whitespace-nowrap">
              OR SIGN IN WITH GOOGLE AUTHENTICATOR
            </span>
            <div className="border-t border-[#f0f1f8] w-full" />
          </div>

          {/* Google Authenticator Action Button (Positioned Below Form per user instruction) */}
          <button
            type="button"
            onClick={handleLaunchRealGoogleAuth}
            disabled={isGoogleLoading}
            className="w-full py-3 px-4 bg-white hover:bg-[#eff0fe]/20 border-2 border-[#f0f1f8] hover:border-purple-300 rounded-2xl text-xs font-black text-slate-700 shadow-xs flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#7065f0]" />
            ) : (
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
            )}
            <span>{isGoogleLoading ? 'Connecting with Google...' : 'Sign in with Google Authenticator'}</span>
          </button>
        </div>
      </div>

      {/* ================= MODAL: GOOGLE OAUTH PROVIDER SETUP (Shown when Supabase provider toggle is needed) ================= */}
      {showGoogleProviderSetupModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[35000] modal-backdrop p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            {/* Google Brand Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
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
                <div>
                  <h3 className="text-sm font-black text-slate-900">Google OAuth Provider Setup</h3>
                  <p className="text-[11px] text-slate-500">Live Browser Google Account Authentication</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleProviderSetupModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-left">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-medium">
                🔑 <strong>Supabase Google Provider Setting (1-Time):</strong>
                <p className="mt-1 text-[10px] text-amber-800">
                  Jab tak Supabase dashboard me Google Provider toggle ON nahi hoga, tab tak Supabase server <code>400 Unsupported provider</code> return karta hai. Isko ON karne ke 2 aasan steps hain:
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      1
                    </span>
                    <strong className="text-slate-900">Google Cloud Console me OAuth Client ID:</strong>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-7 leading-relaxed">
                    <strong>APIs & Services &gt; Credentials &gt; Create Credentials &gt; OAuth client ID</strong> (Web Application).
                  </p>
                  <div className="pl-7 space-y-1">
                    <div className="text-[10px] font-bold text-slate-700">Authorized Redirect URI:</div>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1.5">
                      <code className="text-[10px] text-slate-800 font-mono select-all flex-1 break-all">
                        https://bbykxaxndzkapdjdgeap.supabase.co/auth/v1/callback
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('https://bbykxaxndzkapdjdgeap.supabase.co/auth/v1/callback');
                          showToast('✓ Redirect URI copied to clipboard!');
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                  <div className="pl-7 pt-1">
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                    >
                      Open Google Cloud Console ↗
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      2
                    </span>
                    <strong className="text-slate-900">Supabase me Google Toggle ON karein:</strong>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-7 leading-relaxed">
                    Supabase Project &gt; <strong>Authentication &gt; Providers &gt; Google</strong> me toggle <strong>ON</strong> karein, Google Cloud se mila <strong>Client ID</strong> aur <strong>Client Secret</strong> paste karein aur <strong>Save</strong> karein.
                  </p>
                  <div className="pl-7 pt-1">
                    <a
                      href="https://supabase.com/dashboard/project/bbykxaxndzkapdjdgeap/auth/providers"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Supabase Auth Providers ↗</span>
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      3
                    </span>
                    <strong className="text-slate-900">Supabase URL Configuration (Vercel Redirect Fix):</strong>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-7 leading-relaxed">
                    Supabase Project &gt; <strong>Authentication &gt; URL Configuration</strong> me <strong>Site URL</strong> ko <code>https://sbhdom.vercel.app</code> set karein (na ki vercel.com dashboard).
                  </p>
                  <div className="pl-7 space-y-1">
                    <div className="text-[10px] font-bold text-slate-700">Add to Redirect URLs:</div>
                    <div className="bg-white border border-slate-200 rounded-lg p-2 font-mono text-[10px] text-slate-800 space-y-0.5">
                      <div>https://sbhdom.vercel.app/**</div>
                      <div>http://localhost:5173/**</div>
                    </div>
                  </div>
                  <div className="pl-7 pt-1">
                    <a
                      href="https://supabase.com/dashboard/project/bbykxaxndzkapdjdgeap/auth/url-configuration"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Supabase URL Configuration ↗</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                {/* Instant Test Prompt to verify Account Not Found modal */}
                <button
                  type="button"
                  onClick={() => {
                    const testEmail = prompt('Test with your Google email address:');
                    if (testEmail) {
                      setShowGoogleProviderSetupModal(false);
                      handleVerifyGoogleEmail(testEmail);
                    }
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Test Google Account Verification Directly
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ACCOUNT NOT FOUND - CONTACT WEB ADMINISTRATOR MR. NAMAN MISHRA ================= */}
      {unauthorizedModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[40000] modal-backdrop p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-rose-300 animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 mx-auto mb-3 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 px-3 py-1 rounded-full border border-rose-200">
              ACCOUNT NOT FOUND
            </span>

            <h3 className="text-lg font-black text-slate-900 mt-3">Account Not Found in System</h3>
            <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
              The Google Account <span className="font-bold text-slate-900">{unauthorizedModal.attemptedEmail}</span> is not registered in the DOM Clinical Leadership database.
            </p>

            {/* Official Contact Box for Web Administrator Mr. Naman Mishra */}
            <div className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                FOR ACCOUNT REGISTRATION & ACTIVATION:
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                  NM
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Mr. Naman Mishra</h4>
                  <p className="text-[11px] font-bold text-orange-700">Web Administrator — SBH Group of Hospitals</p>
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
                )}&body=Dear%20Mr.%20Naman%20Mishra,%0A%0AMy%20Google%20account%20(${encodeURIComponent(
                  unauthorizedModal.attemptedEmail
                )})%20was%20not%20found%20in%20the%20DOM%20database.%20Please%20register%20and%20activate%20my%20leadership%20account.%0A%0AThank%20you.`}
                className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Contact Web Administrator (Mr. Naman Mishra)</span>
              </a>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await supabase.auth.signOut();
                  } catch (e) {}
                  setUnauthorizedModal({ isOpen: false, attemptedEmail: '', reason: '' });
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-[45000] modal-backdrop">
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
