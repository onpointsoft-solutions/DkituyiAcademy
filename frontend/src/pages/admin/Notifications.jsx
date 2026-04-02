import React, { useState, useEffect } from 'react';
import { BookOpen, UserPlus, Info, Bell, Check, Trash2 } from 'lucide-react';

const mockNotifications = [
  { id: 1, type: 'book', title: 'New Book Added', message: '"African Stories Vol. 3" has been added to the library', timestamp: '2024-01-15 14:30', read: false },
  { id: 2, type: 'user', title: 'New User Registration', message: 'John Doe (john@example.com) just joined', timestamp: '2024-01-15 13:45', read: false },
  { id: 3, type: 'system', title: 'System Update', message: 'Server maintenance completed successfully', timestamp: '2024-01-15 12:00', read: true },
  { id: 4, type: 'book', title: 'Book Updated', message: '"The Great Adventure" has been updated with new chapters', timestamp: '2024-01-14 16:20', read: true },
  { id: 5, type: 'user', title: 'High Reading Activity', message: 'User Sarah has read 5 books this week', timestamp: '2024-01-14 10:15', read: false },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setTimeout(() => {
      setNotifications(mockNotifications);
      setLoading(false);
    }, 500);
  }, []);

  const filteredNotifications = filter === 'all'
    ? notifications
    : filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type === filter);

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'book': return <BookOpen size={18} className="text-blue-600" />;
      case 'user': return <UserPlus size={18} className="text-green-600" />;
      case 'system': return <Info size={18} className="text-amber-600" />;
      default: return <Bell size={18} className="text-stone-600" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
          <div className="p-2 bg-amber-100 rounded-xl">
            <Bell size={24} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Notifications</h2>
            <p className="text-sm text-stone-500">
              {unreadCount} unread of {notifications.length} total
            </p>
          </div>
        </div>
        <button
          onClick={markAllAsRead}
          className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
        >
          Mark All Read
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['all', 'unread', 'book', 'user', 'system'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-accent text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="divide-y divide-stone-100">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 flex items-start gap-4 ${
                notification.read ? 'bg-stone-50' : 'bg-white'
              }`}
            >
              <div className="p-2 bg-white rounded-lg shadow-sm">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`font-medium ${notification.read ? 'text-stone-600' : 'text-stone-900'}`}>
                      {notification.title}
                      {!notification.read && (
                        <span className="ml-2 w-2 h-2 bg-accent rounded-full inline-block"></span>
                      )}
                    </h3>
                    <p className="text-sm text-stone-500 mt-1">{notification.message}</p>
                    <p className="text-xs text-stone-400 mt-1">{notification.timestamp}</p>
                  </div>
                  <div className="flex gap-1">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredNotifications.length === 0 && (
          <div className="text-center py-12 text-stone-500">
            <Bell size={48} className="mx-auto mb-3 text-stone-300" />
            <p>No notifications found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
