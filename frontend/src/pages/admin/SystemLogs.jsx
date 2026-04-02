import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, Info, CheckCircle, Clock } from 'lucide-react';

const mockLogs = [
  { id: 1, level: 'info', message: 'Server started successfully', timestamp: '2024-01-15 10:30:45', source: 'system' },
  { id: 2, level: 'info', message: 'Database connection established', timestamp: '2024-01-15 10:30:46', source: 'database' },
  { id: 3, level: 'warning', message: 'High memory usage detected', timestamp: '2024-01-15 11:15:22', source: 'monitoring' },
  { id: 4, level: 'info', message: 'User login: vincentAdmin', timestamp: '2024-01-15 12:05:18', source: 'auth' },
  { id: 5, level: 'error', message: 'Failed to send email notification', timestamp: '2024-01-15 12:30:05', source: 'email' },
  { id: 6, level: 'success', message: 'Book uploaded: The Great African Novel', timestamp: '2024-01-15 14:22:33', source: 'books' },
  { id: 7, level: 'info', message: 'Daily backup completed', timestamp: '2024-01-15 23:00:00', source: 'backup' },
];

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Simulate fetching logs
    setTimeout(() => {
      setLogs(mockLogs);
      setLoading(false);
    }, 500);
  }, []);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error': return <AlertCircle size={16} className="text-red-600" />;
      case 'warning': return <AlertCircle size={16} className="text-amber-600" />;
      case 'success': return <CheckCircle size={16} className="text-green-600" />;
      default: return <Info size={16} className="text-blue-600" />;
    }
  };

  const getLevelClass = (level) => {
    switch (level) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'success': return 'bg-green-50 border-green-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-stone-100 rounded-xl">
            <FileText size={24} className="text-stone-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900">System Logs</h2>
            <p className="text-sm text-stone-500">Application events and monitoring</p>
          </div>
        </div>

        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">All Logs</option>
          <option value="info">Info</option>
          <option value="warning">Warnings</option>
          <option value="error">Errors</option>
          <option value="success">Success</option>
        </select>
      </div>

      {/* Logs List */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="divide-y divide-stone-100">
          {filteredLogs.map((log) => (
            <div key={log.id} className={`p-4 ${getLevelClass(log.level)}`}>
              <div className="flex items-start gap-3">
                {getLevelIcon(log.level)}
                <div className="flex-1">
                  <p className="font-medium text-stone-900">{log.message}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-stone-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {log.timestamp}
                    </span>
                    <span className="px-2 py-0.5 bg-white rounded text-xs font-medium">
                      {log.source}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-stone-500">
            <FileText size={48} className="mx-auto mb-3 text-stone-300" />
            <p>No logs found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
