import React, { useState } from 'react';
import { ActivityLogEntry, User, ActionType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Clock, Filter, PlusCircle, Edit, Trash, Move, Type, Calendar } from 'lucide-react';

interface ActivityLogProps {
  logs: ActivityLogEntry[];
  users: User[];
  onNavigate: (context: { courseId?: string, moduleId?: string, lessonId?: string }) => void;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ logs, users, onNavigate }) => {
  const { t } = useLanguage();
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<ActionType | 'all'>('all');

  const filteredLogs = logs.filter(log => {
    const matchesUser = selectedUser === 'all' || log.userId === selectedUser;
    const matchesAction = selectedAction === 'all' || log.action === selectedAction;
    
    const logDate = new Date(log.timestamp).toISOString().split('T')[0];
    const matchesFrom = !dateFrom || logDate >= dateFrom;
    const matchesTo = !dateTo || logDate <= dateTo;

    return matchesUser && matchesAction && matchesFrom && matchesTo;
  });

  const getActionIcon = (action: string) => {
    switch(action) {
        case 'create': return <PlusCircle size={16} className="text-green-600" />;
        case 'update': return <Edit size={16} className="text-blue-600" />;
        case 'delete': return <Trash size={16} className="text-red-600" />;
        case 'move': return <Move size={16} className="text-amber-600" />;
        case 'rename': return <Type size={16} className="text-purple-600" />;
        default: return <Clock size={16} className="text-slate-400" />;
    }
  };

  const handleRowClick = (log: ActivityLogEntry) => {
      if (log.action === 'delete') return;
      if (log.contextIds) {
          onNavigate(log.contextIds);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-2xl font-bold text-slate-900">{t.recentActions}</h2>
           <p className="text-slate-500">{t.trackChanges}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
         <div className="flex gap-4 flex-wrap items-center">
             <div className="flex items-center gap-2 text-slate-500">
                <Filter size={18} />
                <span className="font-medium text-sm">{t.filterUser}:</span>
                <select 
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                >
                    <option value="all">{t.allUsers}</option>
                    {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>
            </div>

            <div className="w-px h-8 bg-slate-200 mx-2 hidden sm:block"></div>

            <div className="flex items-center gap-2 text-slate-500">
                <span className="font-medium text-sm">{t.filterAction}:</span>
                <select 
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value as ActionType | 'all')}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                >
                    <option value="all">{t.allActions}</option>
                    <option value="create">{t.actionTypes.create}</option>
                    <option value="update">{t.actionTypes.update}</option>
                    <option value="delete">{t.actionTypes.delete}</option>
                    <option value="move">{t.actionTypes.move}</option>
                    <option value="rename">{t.actionTypes.rename}</option>
                </select>
            </div>
         </div>

         <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={18} />
                <span className="font-medium text-sm">{t.dateFrom}:</span>
                <input 
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                />
            </div>
            <div className="flex items-center gap-2 text-slate-500">
                <span className="font-medium text-sm">{t.dateTo}:</span>
                <input 
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                />
            </div>
            {(dateFrom || dateTo) && (
                <button 
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="text-xs text-indigo-600 hover:underline ml-2"
                >
                    {t.allTime}
                </button>
            )}
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        <th className="px-6 py-3 w-40">{t.date}</th>
                        <th className="px-6 py-3 w-48">{t.user}</th>
                        <th className="px-6 py-3 w-32">{t.actions}</th>
                        <th className="px-6 py-3 w-32">{t.role}</th> 
                        <th className="px-6 py-3">{t.details}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredLogs.length > 0 ? (
                        filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                            {log.userName.charAt(0)}
                                        </div>
                                        {log.userName}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {getActionIcon(log.action)}
                                        <span className="capitalize text-slate-700">
                                            {t.actionTypes[log.action as keyof typeof t.actionTypes]}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 capitalize">
                                    {t.targetTypes[log.targetType as keyof typeof t.targetTypes]}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {log.action === 'delete' ? (
                                        <>
                                            <span className="font-semibold text-slate-800 opacity-60 line-through decoration-slate-400">{log.targetTitle}</span>
                                            {log.details && (
                                                <span className="text-slate-400 ml-2 text-xs"> — {log.details}</span>
                                            )}
                                        </>
                                    ) : (
                                        <button 
                                            onClick={() => handleRowClick(log)}
                                            className="text-left group"
                                            title="Click to view"
                                        >
                                            <span className="font-semibold text-slate-800 group-hover:text-indigo-600 group-hover:underline transition-colors">{log.targetTitle}</span>
                                            {log.details && (
                                                <span className="text-slate-400 ml-2 text-xs"> — {log.details}</span>
                                            )}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                No activity found matching criteria
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};