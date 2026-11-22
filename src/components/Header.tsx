import React from 'react';
import { Bell, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDom } from '../context/DomContext';
import defaultLeaderAvatar from '../assets/default-leader-avatar.png';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { currentLeader, logout } = useAuth();
  const { meeting, triggerScheduledReminders } = useDom();

  const handleSimulateScheduler = (type: '1000' | '1005' | '1020') => {
    const res = triggerScheduledReminders(type);
    alert(`[DOM Notification Engine]\n${res.message}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs z-10">
      {/* Title & Date */}
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>{meeting.title}</span>
            <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
              Live Session
            </span>
          </h1>
          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}{' '}
              (IST)
            </span>
            <span>•</span>
            <span>Conference Hall & Google Meet</span>
          </div>
        </div>
      </div>

      {/* Controls & User Profile */}
      <div className="flex items-center space-x-4">
        {/* Scheduled Automation Triggers (Admin Quick Access) */}
        {currentLeader && (currentLeader.role === 'ADMIN' || currentLeader.role === 'SUPER_ADMIN') && (
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
              <Bell className="w-3 h-3 text-slate-400" /> Reminders:
            </span>
            <button
              onClick={() => handleSimulateScheduler('1000')}
              title="Dispatches 10:00 AM Initial WhatsApp Link to Unresolved Leaders"
              className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 text-[11px] font-medium text-slate-700 rounded shadow-xs border border-slate-200 transition-colors"
            >
              10:00 AM
            </button>
            <button
              onClick={() => handleSimulateScheduler('1005')}
              title="Dispatches 10:05 AM Follow-up Reminder"
              className="px-2 py-1 bg-white hover:bg-amber-50 hover:text-amber-700 text-[11px] font-medium text-slate-700 rounded shadow-xs border border-slate-200 transition-colors"
            >
              10:05 AM
            </button>
            <button
              onClick={() => handleSimulateScheduler('1020')}
              title="Dispatches 10:20 AM Group Escalation to DOM Leadership Group"
              className="px-2 py-1 bg-white hover:bg-rose-50 hover:text-rose-700 text-[11px] font-semibold text-rose-700 rounded shadow-xs border border-rose-200 transition-colors"
            >
              10:20 AM (Escalate)
            </button>
          </div>
        )}

        {/* Current User Badge & Logout */}
        {currentLeader ? (
          <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-800">{currentLeader.full_name}</div>
              <div className="text-[11px] text-blue-600 font-medium">
                {currentLeader.employee_code} • {currentLeader.role}
              </div>
            </div>
            <img
              src={defaultLeaderAvatar}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-leader-avatar.png'; }}
              alt={currentLeader.full_name}
              className="w-9 h-9 rounded-full object-cover border border-purple-200 shadow-xs shrink-0"
            />
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs hover:bg-blue-700"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
