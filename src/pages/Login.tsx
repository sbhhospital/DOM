import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hospital, ShieldCheck, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithEmail, allLeaders, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setErrorMsg('');
    setSubmitting(true);

    const res = await loginWithEmail(email);
    setSubmitting(false);

    if (res.success) {
      navigate('/');
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleQuickLogin = async (leadEmail: string) => {
    setEmail(leadEmail);
    setErrorMsg('');
    setSubmitting(true);
    const res = await loginWithEmail(leadEmail);
    setSubmitting(false);
    if (res.success) {
      navigate('/');
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Branding */}
        <div className="bg-slate-900 p-8 text-center text-white relative">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
            <Hospital className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">SBH GROUP OF HOSPITAL</h1>
          <p className="text-xs text-blue-300 font-medium tracking-wide mt-1">
            Raipur • Daily Operations Meeting (DOM)
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-full text-[11px] text-slate-300 border border-slate-700 mt-4">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Hospital Leadership Access Portal
          </div>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Hospital Leader Sign In</h2>
          <p className="text-xs text-slate-500 mb-6">
            Enter your registered hospital email address to access the DOM attendance console.
          </p>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Registered Official Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name.dept@sbh.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? 'Verifying Account...' : 'Sign In to DOM System'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Select for Active Hospital Leaders in Database */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
              Select Registered Hospital Leader:
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {allLeaders.slice(0, 6).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => handleQuickLogin(l.email)}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-50 border border-slate-200 flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{l.full_name}</div>
                    <div className="text-[10px] text-slate-500">
                      {l.email} • <span className="font-mono text-blue-600 font-bold">{l.role}</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded">Login</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400">
          SBH Group of Hospital • Secure Enterprise Access
        </div>
      </div>
    </div>
  );
};
