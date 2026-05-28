import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Reminder() {
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    date: '',
    time: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/reminders');
      setReminders(response.data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      const savedReminders = localStorage.getItem('notecraftr_reminders');
      if (savedReminders) {
        setReminders(JSON.parse(savedReminders));
      }
    }
  };

  const saveReminderLocally = (updatedReminders) => {
    localStorage.setItem('notecraftr_reminders', JSON.stringify(updatedReminders));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newReminder.title || !newReminder.date || !newReminder.time) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const reminderData = {
        ...newReminder,
        id: Date.now().toString(),
        isCompleted: false,
        createdAt: new Date().toISOString()
      };

      try {
        const response = await axios.post('http://localhost:5000/api/reminders', reminderData);
        const savedReminder = response.data;
        setReminders([savedReminder, ...reminders]);
      } catch {
        const updatedReminders = [reminderData, ...reminders];
        setReminders(updatedReminders);
        saveReminderLocally(updatedReminders);
      }

      setNewReminder({ title: '', description: '', date: '', time: '' });
    } catch (error) {
      console.error('Error creating reminder:', error);
      alert('Failed to create reminder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComplete = async (id) => {
    try {
      const reminder = reminders.find(r => r.id === id || r._id === id);
      const updatedReminder = { ...reminder, isCompleted: !reminder.isCompleted };

      try {
        await axios.put(`http://localhost:5000/api/reminders/${id}`, updatedReminder);
      } catch {
        console.warn('API unavailable, updating locally');
      }

      const updatedReminders = reminders.map(r =>
        (r.id === id || r._id === id) ? updatedReminder : r
      );
      setReminders(updatedReminders);
      saveReminderLocally(updatedReminders);
    } catch (error) {
      console.error('Error updating reminder:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;

    try {
      try {
        await axios.delete(`http://localhost:5000/api/reminders/${id}`);
      } catch {
        console.warn('API unavailable, deleting locally');
      }

      const updatedReminders = reminders.filter(r => r.id !== id && r._id !== id);
      setReminders(updatedReminders);
      saveReminderLocally(updatedReminders);
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const formatDateTime = (date, time) => {
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUpcoming = (date, time) => {
    const reminderDateTime = new Date(`${date}T${time}`);
    return reminderDateTime > new Date();
  };

  const sortedReminders = [...reminders].sort((a, b) => {
    const aDateTime = new Date(`${a.date}T${a.time}`);
    const bDateTime = new Date(`${b.date}T${b.time}`);
    return aDateTime - bDateTime;
  });

  const upcomingReminders = sortedReminders.filter(r => !r.isCompleted && isUpcoming(r.date, r.time));
  const completedReminders = sortedReminders.filter(r => r.isCompleted);
  const pastReminders = sortedReminders.filter(r => !r.isCompleted && !isUpcoming(r.date, r.time));

  return (
    <div className="reminder-container">
      <div className="reminder-header">
        <h2>⏰ Reminders</h2>
        <p>Set reminders for important tasks and notes</p>
      </div>

      <div className="add-reminder-section">
        <h3>➕ Create New Reminder</h3>
        <form onSubmit={handleSubmit} className="reminder-form">
          <div className="form-row">
            <input
              type="text"
              placeholder="Reminder title *"
              value={newReminder.title}
              onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
              required
            />
          </div>
          <div className="form-row">
            <textarea
              placeholder="Description (optional)"
              value={newReminder.description}
              onChange={(e) => setNewReminder({...newReminder, description: e.target.value})}
              rows="3"
            />
          </div>
          <div className="form-row">
            <input
              type="date"
              value={newReminder.date}
              onChange={(e) => setNewReminder({...newReminder, date: e.target.value})}
              required
              min={new Date().toISOString().split('T')[0]}
            />
            <input
              type="time"
              value={newReminder.time}
              onChange={(e) => setNewReminder({...newReminder, time: e.target.value})}
              required
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? '⏳ Creating...' : '➕ Create Reminder'}
          </button>
        </form>
      </div>

      {upcomingReminders.length > 0 && (
        <div className="reminder-section">
          <h3>🔔 Upcoming Reminders ({upcomingReminders.length})</h3>
          {upcomingReminders.map(reminder => (
            <div key={reminder.id || reminder._id} className="reminder-card upcoming">
              <div className="reminder-header">
                <h4>{reminder.title}</h4>
                <div>
                  <button onClick={() => handleToggleComplete(reminder.id || reminder._id)}>✓</button>
                  <button onClick={() => handleDelete(reminder.id || reminder._id)}>🗑️</button>
                </div>
              </div>
              {reminder.description && <p>{reminder.description}</p>}
              <div>📅 {formatDateTime(reminder.date, reminder.time)}</div>
            </div>
          ))}
        </div>
      )}

      {pastReminders.length > 0 && (
        <div className="reminder-section">
          <h3>⏰ Overdue Reminders ({pastReminders.length})</h3>
          {pastReminders.map(reminder => (
            <div key={reminder.id || reminder._id} className="reminder-card overdue">
              <div className="reminder-header">
                <h4>{reminder.title}</h4>
                <div>
                  <button onClick={() => handleToggleComplete(reminder.id || reminder._id)}>✓</button>
                  <button onClick={() => handleDelete(reminder.id || reminder._id)}>🗑️</button>
                </div>
              </div>
              {reminder.description && <p>{reminder.description}</p>}
              <div>📅 {formatDateTime(reminder.date, reminder.time)} (Overdue)</div>
            </div>
          ))}
        </div>
      )}

      {completedReminders.length > 0 && (
        <div className="reminder-section">
          <h3>✅ Completed Reminders ({completedReminders.length})</h3>
          {completedReminders.map(reminder => (
            <div key={reminder.id || reminder._id} className="reminder-card completed">
              <div className="reminder-header">
                <h4>{reminder.title}</h4>
                <div>
                  <button onClick={() => handleToggleComplete(reminder.id || reminder._id)}>↩️</button>
                  <button onClick={() => handleDelete(reminder.id || reminder._id)}>🗑️</button>
                </div>
              </div>
              {reminder.description && <p>{reminder.description}</p>}
              <div>📅 {formatDateTime(reminder.date, reminder.time)}</div>
            </div>
          ))}
        </div>
      )}

      {reminders.length === 0 && (
        <div className="empty-state">
          <h3>No reminders yet!</h3>
          <p>Create your first reminder to stay organized</p>
        </div>
      )}
    </div>
  );
}

export default Reminder;
