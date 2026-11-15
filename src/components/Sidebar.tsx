import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  QrCode,
  CheckCircle2,
  CalendarCheck,
  FileSpreadsheet,
  History,
  ShieldCheck,
  UserCheck,
  Hospital,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDom } from '../context/DomContext';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { currentLeader, allLeaders, switchLeader, logout } = useAuth();
  const { metrics } = useDom();

  const navItems = [
    { to: '/', label: 'Director Dashboard', icon: LayoutDashboard },
    { to: '/admin-queue', label: 'In-Room Verification Queue', icon: CheckCircle2, badge: metrics.pendingPhysicalVerification },
    { to: '/project-qr', label: 'DOM Conference Hall QR', icon: QrCode },
    { to: '/personal-portal', label: 'Leader Attendance Portal', icon: UserCheck },
    { to: '/hr-leave', label: 'HR Leave & Exceptions', icon: CalendarCheck },
    { to: '/reports', label: 'Director Reports & Export', icon: FileSpreadsheet },
    { to: '/audit-trail', label: 'Admin Audit Trail', icon: History },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shadow-xl select-none">
      {/* Hospital Identity Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3 bg-gradient-to-r from-blue-950/60 to-slate-900">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold">
          <Hospital className="w-6 h-6" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-wide text-white uppercase">SBH Group of Hospital</div>
          <div className="text-xs text-blue-300 font-medium tracking-tight">Raipur • DOM System</div>
        </div>
      </div>

      {/* Role / Active Leader Display from Supabase */}
      {currentLeader && (
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Active Leader
            </span>
            <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded font-mono font-medium">
              {currentLeader.role}
            </span>
          </div>
          <select
            value={currentLeader.id}
            onChange={(e) => switchLeader(e.target.value)}
            className="w-full bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {allLeaders.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.full_name} ({lead.role})
              </option>
            ))}
          </select>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            {currentLeader.department?.name || 'Hospital Administration'}
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Hospital Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sign Out Button in Sidebar */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out Account
        </button>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center px-4">
        <span>SBH Raipur v1.0.0</span>
        <span className="text-emerald-500 flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Supabase Live
        </span>
      </div>
    </aside>
  );
};
