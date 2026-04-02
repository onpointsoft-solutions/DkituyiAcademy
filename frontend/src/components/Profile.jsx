import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, BookOpen, Clock, TrendingUp, Award, Edit2, Camera, X, Check, AlertCircle } from 'lucide-react';
import api from '../api/axiosClient';

export default function Profile() {
  const [userProfile, setUserProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/user/profile/');
      setUserProfile(response.data);
      setFormData(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/api/user/profile/', formData);
      setUserProfile(response.data);
      setSuccess('Profile updated successfully!');
      setEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(userProfile);
    setEditing(false);
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        <span className="ml-3 text-ink-500">Loading profile...</span>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-ink-900 mb-2">Profile Not Available</h3>
        <p className="text-ink-600">Unable to load your profile information.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-cream-300 shadow-book p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-reading text-2xl font-bold text-ink-900">My Profile</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              <Edit2 size={16} />
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-cream-200 flex items-center justify-center">
                {userProfile.avatar ? (
                  <img
                    src={userProfile.avatar}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User size={40} className="text-ink-400" />
                )}
              </div>
              {editing && (
                <button
                  type="button"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center hover:bg-accent-hover transition-colors"
                >
                  <Camera size={16} />
                </button>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-xl text-ink-900">
                {userProfile.first_name && userProfile.last_name 
                  ? `${userProfile.first_name} ${userProfile.last_name}`
                  : userProfile.username || 'User'
                }
              </h3>
              <p className="text-ink-500">Member since {new Date(userProfile.date_joined).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name || ''}
                onChange={handleInputChange}
                disabled={!editing}
                className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-cream-50 disabled:text-ink-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name || ''}
                onChange={handleInputChange}
                disabled={!editing}
                className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-cream-50 disabled:text-ink-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                disabled={!editing}
                className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-cream-50 disabled:text-ink-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username || ''}
                onChange={handleInputChange}
                disabled={!editing}
                className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-cream-50 disabled:text-ink-400"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio || ''}
              onChange={handleInputChange}
              disabled={!editing}
              rows={3}
              className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-cream-50 disabled:text-ink-400"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Reading Preferences */}
          <div>
            <h3 className="font-semibold text-ink-900 mb-4">Reading Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  Favorite Genres
                </label>
                <input
                  type="text"
                  name="favorite_genres"
                  value={formData.favorite_genres || ''}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-cream-50 disabled:text-ink-400"
                  placeholder="e.g., Fiction, Mystery, Romance"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  Reading Goal (books per month)
                </label>
                <input
                  type="number"
                  name="reading_goal"
                  value={formData.reading_goal || ''}
                  onChange={handleInputChange}
                  disabled={!editing}
                  min="1"
                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-cream-50 disabled:text-ink-400"
                  placeholder="e.g., 2"
                />
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={16} className="text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Check size={16} className="text-green-500" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          {/* Action Buttons */}
          {editing && (
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-cream-300 text-ink-700 rounded-lg hover:bg-cream-50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Reading Statistics */}
      <div className="bg-white rounded-xl border border-cream-300 shadow-book p-6">
        <h3 className="font-reading text-xl font-semibold text-ink-900 mb-6">Reading Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <BookOpen size={24} className="text-accent" />
            </div>
            <div className="text-2xl font-bold text-ink-900 font-reading">
              {userProfile.books_read || 0}
            </div>
            <p className="text-sm text-ink-500">Books Read</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock size={24} className="text-green-500" />
            </div>
            <div className="text-2xl font-bold text-ink-900 font-reading">
              {userProfile.reading_hours || 0}h
            </div>
            <p className="text-sm text-ink-500">Reading Time</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-ink-600/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={24} className="text-ink-600" />
            </div>
            <div className="text-2xl font-bold text-ink-900 font-reading">
              {userProfile.reading_streak || 0}
            </div>
            <p className="text-sm text-ink-500">Day Streak</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award size={24} className="text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-ink-900 font-reading">
              {userProfile.achievements || 0}
            </div>
            <p className="text-sm text-ink-500">Achievements</p>
          </div>
        </div>
      </div>
    </div>
  );
}
