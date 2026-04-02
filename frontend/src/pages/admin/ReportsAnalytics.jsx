import React, { useState, useEffect } from 'react';
import { BarChart3, BookOpen, Eye, Calendar } from 'lucide-react';
import api from '../../api/axiosClient';

export default function ReportsAnalytics() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/reports/');
      setReports(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
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

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchReports}
            className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-100 rounded-xl">
          <BarChart3 size={24} className="text-red-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Reports & Analytics</h2>
          <p className="text-sm text-stone-500">Reading activity and insights</p>
        </div>
      </div>

      {/* Top Books */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <BookOpen size={20} className="text-accent" />
          Top Books by Reading Activity
        </h3>
        {reports?.topBooks?.length > 0 ? (
          <div className="space-y-3">
            {reports.topBooks.map((book, index) => (
              <div key={book.id} className="flex items-center gap-4 p-3 bg-stone-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-stone-900">{book.title}</p>
                  <p className="text-sm text-stone-500">{book.author_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-stone-900">{book.read_count}</p>
                  <p className="text-xs text-stone-500">readers</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">{book.completed_count}</p>
                  <p className="text-xs text-stone-500">completed</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-stone-500 text-center py-8">No reading activity data available.</p>
        )}
      </div>

      {/* Sessions by Day */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-accent" />
          Reading Sessions (Last 7 Days)
        </h3>
        {reports?.sessionsByDay?.length > 0 ? (
          <div className="space-y-3">
            {reports.sessionsByDay.map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-24 text-sm text-stone-600">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1 h-8 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (day.sessions / Math.max(...reports.sessionsByDay.map(d => d.sessions))) * 100)}%`
                    }}
                  />
                </div>
                <div className="w-12 text-right text-sm font-medium text-stone-900">
                  {day.sessions}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-stone-500 text-center py-8">No session data available.</p>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <Eye size={20} className="text-accent" />
          Recent Reading Sessions
        </h3>
        {reports?.recentActivity?.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {reports.recentActivity.slice(0, 20).map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 hover:bg-stone-50 rounded-lg transition-colors">
                <div>
                  <p className="font-medium text-stone-900">{session.book_title}</p>
                  <p className="text-sm text-stone-500">User #{session.user_id}</p>
                </div>
                <div className="text-right text-sm text-stone-500">
                  <p>{new Date(session.start_time).toLocaleString()}</p>
                  {session.duration_minutes && (
                    <p className="text-xs">{session.duration_minutes} min</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-stone-500 text-center py-8">No recent activity.</p>
        )}
      </div>
    </div>
  );
}
