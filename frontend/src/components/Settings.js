import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

function Settings({ user, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    bio: user?.bio || '',
    profileVisibility: user?.profileVisibility || 'private'
  });
  const [preferences, setPreferences] = useState({
    theme: 'light',
    defaultNoteCategory: 'personal',
    autoSave: true,
    notifications: true,
    emailNotifications: false,
    showPreview: true,
    defaultView: 'notes'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Update profile state when user prop changes
  useEffect(() => {
    setProfile({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      bio: user?.bio || '',
      profileVisibility: user?.profileVisibility || 'private'
    });
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const res = await axios.put(`${API_URL}/user/profile`, profile, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setMessage('Profile updated successfully!');
      
      // Update the user state in parent component
      if (onUserUpdate) {
        onUserUpdate(res.data.user);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage(error.response?.data?.message || 'Error updating profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMessage('Preferences saved successfully!');
    } catch (error) {
      setMessage('Error saving preferences.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="settings-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>⚙️ Settings</h2>

      <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('profile')}
          style={{ background: activeTab === 'profile' ? '#6366f1' : '#e5e7eb', color: activeTab === 'profile' ? 'white' : 'black', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer' }}
        >
          Profile
        </button>
        <button 
          onClick={() => setActiveTab('preferences')}
          style={{ background: activeTab === 'preferences' ? '#6366f1' : '#e5e7eb', color: activeTab === 'preferences' ? 'white' : 'black', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer' }}
        >
          Preferences
        </button>
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="First Name" 
            value={profile.firstName} 
            onChange={(e) => setProfile({...profile, firstName: e.target.value})} 
          />
          <input 
            type="text" 
            placeholder="Last Name" 
            value={profile.lastName} 
            onChange={(e) => setProfile({...profile, lastName: e.target.value})} 
          />
          <input 
            type="email" 
            placeholder="Email" 
            value={profile.email} 
            onChange={(e) => setProfile({...profile, email: e.target.value})} 
          />
          <textarea 
            placeholder="Bio" 
            value={profile.bio} 
            onChange={(e) => setProfile({...profile, bio: e.target.value})} 
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label>Profile Visibility:</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                type="radio" 
                name="profileVisibility" 
                value="private" 
                checked={profile.profileVisibility === 'private'} 
                onChange={(e) => setProfile({...profile, profileVisibility: e.target.value})} 
              />
              Private
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                type="radio" 
                name="profileVisibility" 
                value="public" 
                checked={profile.profileVisibility === 'public'} 
                onChange={(e) => setProfile({...profile, profileVisibility: e.target.value})} 
              />
              Public
            </label>
          </div>
          <button type="submit" disabled={isLoading} style={{ background: '#10b981', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {isLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      )}

      {activeTab === 'preferences' && (
        <form onSubmit={handlePreferencesUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label>
            Theme:
            <select value={preferences.theme} onChange={(e) => setPreferences({...preferences, theme: e.target.value})}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label>
            Default Note Category:
            <input 
              type="text" 
              value={preferences.defaultNoteCategory} 
              onChange={(e) => setPreferences({...preferences, defaultNoteCategory: e.target.value})} 
            />
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={preferences.autoSave} 
              onChange={(e) => setPreferences({...preferences, autoSave: e.target.checked})} 
            />
            Auto Save Notes
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={preferences.notifications} 
              onChange={(e) => setPreferences({...preferences, notifications: e.target.checked})} 
            />
            Enable Notifications
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={preferences.emailNotifications} 
              onChange={(e) => setPreferences({...preferences, emailNotifications: e.target.checked})} 
            />
            Email Notifications
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={preferences.showPreview} 
              onChange={(e) => setPreferences({...preferences, showPreview: e.target.checked})} 
            />
            Show Note Preview
          </label>
          <button type="submit" disabled={isLoading} style={{ background: '#10b981', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {isLoading ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      )}

      {message && <p style={{ marginTop: '15px', color: 'green' }}>{message}</p>}
    </div>
  );
}

export default Settings;

    