import React, { useState } from 'react';
import { Settings, Bell, Shield, Database, Save, Globe } from 'lucide-react';

export default function SystemSettings() {
  const [settings, setSettings] = useState({
    siteName: 'dkituyi academy',
    adminEmail: 'admin@dkituyi.com',
    enableNotifications: true,
    enableEmailAlerts: true,
    maintenanceMode: false,
    allowRegistration: true,
    defaultBookAccess: 'preview',
    maxUploadSize: 50,
    sessionTimeout: 60,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-stone-100 rounded-xl">
          <Settings size={24} className="text-stone-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-900">System Settings</h2>
          <p className="text-sm text-stone-500">Configure application preferences</p>
        </div>
      </div>

      {/* Settings Form */}
      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <Globe size={20} className="text-accent" />
            General Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Site Name</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => updateSetting('siteName', e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Admin Email</label>
              <input
                type="email"
                value={settings.adminEmail}
                onChange={(e) => updateSetting('adminEmail', e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <Bell size={20} className="text-accent" />
            Notifications
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
                className="w-4 h-4 text-accent rounded focus:ring-accent"
              />
              <span className="text-stone-700">Enable in-app notifications</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableEmailAlerts}
                onChange={(e) => updateSetting('enableEmailAlerts', e.target.checked)}
                className="w-4 h-4 text-accent rounded focus:ring-accent"
              />
              <span className="text-stone-700">Enable email alerts</span>
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <Shield size={20} className="text-accent" />
            Security & Access
          </h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowRegistration}
                onChange={(e) => updateSetting('allowRegistration', e.target.checked)}
                className="w-4 h-4 text-accent rounded focus:ring-accent"
              />
              <span className="text-stone-700">Allow new user registration</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                className="w-32 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <Database size={20} className="text-accent" />
            Maintenance
          </h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => updateSetting('maintenanceMode', e.target.checked)}
              className="w-4 h-4 text-accent rounded focus:ring-accent"
            />
            <span className="text-stone-700">Enable maintenance mode</span>
          </label>
          <p className="text-sm text-stone-500 mt-2 ml-7">
            When enabled, only admins can access the site.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Save size={20} />
                Saved!
              </>
            ) : (
              <>
                <Save size={20} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
