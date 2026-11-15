import React from 'react';
import { History, ShieldAlert, Clock, User, FileText, CheckCircle2 } from 'lucide-react';
import { useDom } from '../context/DomContext';

export const AuditTrail: React.FC = () => {
  const { auditLogs, notificationLog } = useDom();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Administrative Audit Trail & Notification History</span>
          <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-slate-200">
            Immutable Ledger
          </span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Every manual attendance verification, rejection reason, leave exemption, and scheduled reminder dispatch is
          cryptographically logged.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audit Logs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              Administrative Actions Ledger
            </span>
            <span className="text-slate-400 font-normal">Entries: {auditLogs.length}</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold font-mono uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(log.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-800 mt-1.5">{log.reason}</div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  Actor: <span className="font-medium text-slate-700">{log.actor_name || 'System Operator'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp & Email Notification Dispatch Logs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              Scheduled Reminder Dispatches
            </span>
            <span className="text-slate-400 font-normal">Dispatches: {notificationLog.length}</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {notificationLog.map((n) => (
              <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {n.type}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{n.time}</span>
                </div>

                <div className="text-xs font-medium text-slate-800 mt-1">Recipient: {n.recipient}</div>

                <div className="flex items-center justify-between mt-2 pt-1 text-[11px]">
                  <span className="text-slate-500">Channel: {n.channel} API Adapter</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> {n.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
