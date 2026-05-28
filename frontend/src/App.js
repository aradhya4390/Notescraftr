import logo from './components/logo1.png';
import React, { useState, useEffect } from 'react';
import './App.css';
import { MdArticle, MdStarBorder, MdCalendarToday, MdAlarm, MdLabelOutline, MdArchive, MdDeleteOutline, MdWarningAmber, MdSettings, MdSearch } from 'react-icons/md';
import Welcome from './pages/Welcome';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Calendar from './components/Calendar';
import Reminder from './components/Reminder';
import Settings from './components/Settings';
import PublicNotesSearch from './components/PublicNotesSearch';
import CreateNoteModal from './components/modal';

import axios from 'axios';

function App() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState('none');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [notes, setNotes] = useState([]);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || '');
  
  // New states for features
  const [currentView, setCurrentView] = useState('notes');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [noteCategory, setNoteCategory] = useState('personal');
  const [favoriteNotes, setFavoriteNotes] = useState([]);
  const [archivedNotes, setArchivedNotes] = useState([]);
  const [trashedNotes, setTrashedNotes] = useState([]);
  const [editingNote, setEditingNote] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // UPDATED AI Features states - simplified to only use topic
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAIFeatures, setShowAIFeatures] = useState(false);
  const [moderatedNotes, setModeratedNotes] = useState([]);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_URL = 'http://localhost:5001/api';

  // Available options
  const availableTags = ['Work', 'Personal', 'Ideas', 'Shopping', 'Travel', 'Health', 'Education', 'AI-Generated'];
  const availableCategories = ['personal', 'work', 'ideas', 'important'];

  // Initialize auth state
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      setAuthToken(token);
      setUser(JSON.parse(userData));
      setIsLoggedIn(true);
      setShowWelcome(false);
    }
  }, []);

  // Fetch notes after login
  useEffect(() => {
    if (isLoggedIn && authToken) {
      fetchNotes();
      if (currentView === 'moderated') {
        fetchModeratedNotes();
      }
    }
  }, [isLoggedIn, authToken, currentView]);

  // API helper with auth headers
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  });

  const showMessage = (message, type = 'error') => {
    if (type === 'error') {
      setError(message);
      setTimeout(() => setError(''), 5000);
    } else {
      setSuccess(message);
      setTimeout(() => setSuccess(''), 5000);
    }
  };

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/notes`, {
        headers: getAuthHeaders()
      });
      
      const allNotes = res.data.map(note => ({
        ...note,
        tags: note.tags || [],
        category: note.category || 'personal',
        isFavorite: note.isFavorite || false,
        isArchived: note.isArchived || false,
        isTrashed: note.isTrashed || false,
      }));
      
      setNotes(allNotes.filter(note => !note.isTrashed && !note.isArchived));
      setArchivedNotes(allNotes.filter(note => note.isArchived && !note.isTrashed));
      setTrashedNotes(allNotes.filter(note => note.isTrashed));
      setFavoriteNotes(allNotes.filter(note => note.isFavorite && !note.isTrashed && !note.isArchived));
    } catch (err) {
      showMessage('Failed to fetch notes');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModeratedNotes = async () => {
    try {
      const res = await axios.get(`${API_URL}/moderated-notes`, {
        headers: getAuthHeaders()
      });
      setModeratedNotes(res.data);
    } catch (err) {
      console.error('Failed to fetch moderated notes:', err);
    }
  };

  // UPDATED AI Note Generation - simplified to only use topic
  const handleGenerateAINotes = async () => {
    if (!aiTopic.trim()) {
      showMessage('Please enter a topic for AI note generation');
      return;
    }

    try {
      setIsGeneratingAI(true);
      const res = await axios.post(`${API_URL}/ai/generate-notes`, {
        topic: aiTopic.trim()
      }, {
        headers: getAuthHeaders()
      });

      showMessage('AI notes generated successfully!', 'success');
      setAiTopic('');
      setShowAIFeatures(false);
      await fetchNotes();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to generate AI notes');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Add/Update note
  const handleAddNote = async () => {
    if (!title.trim() || !content.trim()) {
      showMessage('Title and content are required');
      return;
    }

    try {
      setIsLoading(true);
      const noteData = {
        title,
        content,
        tags: selectedTag ? [selectedTag] : [],
        category: noteCategory,
        subject: selectedTag // Use selected tag as subject for moderation
      };

      let savedNote;
      if (editingNote) {
        const res = await axios.put(`${API_URL}/notes/${editingNote._id}`, noteData, {
          headers: getAuthHeaders()
        });
        savedNote = res.data;
        setNotes(notes.map(note => note._id === editingNote._id ? savedNote : note));
        showMessage('Note updated successfully!', 'success');
      } else {
        const res = await axios.post(`${API_URL}/notes`, noteData, {
          headers: getAuthHeaders()
        });
        savedNote = res.data;
        setNotes([savedNote, ...notes]);
        showMessage('Note created successfully!', 'success');
      }

      // Check if note was moderated
      if (savedNote.isModerated) {
        showMessage('Note was flagged for review due to content concerns', 'error');
      }

      resetForm();
      setShowCreateModal(false);
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to save note');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedTag('');
    setNoteCategory('personal');
    setEditingNote(null);
  };

  // Edit note
  const handleEditNote = (note) => {
    setTitle(note.title);
    setContent(note.content);
    setSelectedTag(note.tags[0] || '');
    setNoteCategory(note.category);
    setEditingNote(note);
    setCurrentView('notes');
    setShowCreateModal(true);
  };

  // Delete note (move to trash)
  const handleDelete = async (id) => {
    try {
      const note = [...notes, ...archivedNotes, ...favoriteNotes].find(n => n._id === id);
      if (!note) return;

      await axios.put(`${API_URL}/notes/${id}`, {
        ...note,
        isTrashed: true
      }, {
        headers: getAuthHeaders()
      });

      setNotes(notes.filter(n => n._id !== id));
      setArchivedNotes(archivedNotes.filter(n => n._id !== id));
      setFavoriteNotes(favoriteNotes.filter(n => n._id !== id));
      setTrashedNotes([{ ...note, isTrashed: true }, ...trashedNotes]);
      
      showMessage('Note moved to trash', 'success');
    } catch (err) {
      showMessage('Failed to delete note');
    }
  };

  // Permanently delete note
  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this note?')) return;

    try {
      await axios.delete(`${API_URL}/notes/${id}`, {
        headers: getAuthHeaders()
      });
      
      setTrashedNotes(trashedNotes.filter(n => n._id !== id));
      showMessage('Note permanently deleted', 'success');
    } catch (err) {
      showMessage('Failed to permanently delete note');
    }
  };

  // Restore from trash
  const handleRestoreNote = async (id) => {
    try {
      const note = trashedNotes.find(n => n._id === id);
      if (!note) return;

      await axios.put(`${API_URL}/notes/${id}`, {
        ...note,
        isTrashed: false
      }, {
        headers: getAuthHeaders()
      });

      setTrashedNotes(trashedNotes.filter(n => n._id !== id));
      
      if (note.isArchived) {
        setArchivedNotes([{ ...note, isTrashed: false }, ...archivedNotes]);
      } else {
        setNotes([{ ...note, isTrashed: false }, ...notes]);
      }
      
      showMessage('Note restored successfully', 'success');
    } catch (err) {
      showMessage('Failed to restore note');
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (id) => {
    try {
      const note = notes.find(n => n._id === id);
      if (!note) return;

      const updatedNote = { ...note, isFavorite: !note.isFavorite };
      
      await axios.put(`${API_URL}/notes/${id}`, updatedNote, {
        headers: getAuthHeaders()
      });

      setNotes(notes.map(n => n._id === id ? updatedNote : n));
      
      if (updatedNote.isFavorite) {
        setFavoriteNotes([updatedNote, ...favoriteNotes.filter(n => n._id !== id)]);
      } else {
        setFavoriteNotes(favoriteNotes.filter(n => n._id !== id));
      }
    } catch (err) {
      showMessage('Failed to update favorite status');
    }
  };

  // Archive note
  const handleArchiveNote = async (id) => {
    try {
      const note = notes.find(n => n._id === id);
      if (!note) return;

      await axios.put(`${API_URL}/notes/${id}`, {
        ...note,
        isArchived: true
      }, {
        headers: getAuthHeaders()
      });

      setNotes(notes.filter(n => n._id !== id));
      setFavoriteNotes(favoriteNotes.filter(n => n._id !== id));
      setArchivedNotes([{ ...note, isArchived: true }, ...archivedNotes]);
      
      showMessage('Note archived successfully', 'success');
    } catch (err) {
      showMessage('Failed to archive note');
    }
  };

  // Restore from archive
  const handleRestoreFromArchive = async (id) => {
    try {
      const note = archivedNotes.find(n => n._id === id);
      if (!note) return;

      await axios.put(`${API_URL}/notes/${id}`, {
        ...note,
        isArchived: false
      }, {
        headers: getAuthHeaders()
      });

      setArchivedNotes(archivedNotes.filter(n => n._id !== id));
      setNotes([{ ...note, isArchived: false }, ...notes]);
      
      showMessage('Note restored from archive', 'success');
    } catch (err) {
      showMessage('Failed to restore note');
    }
  };

  // Export note as PDF
  const handleExportPDF = async (id) => {
    try {
      const response = await axios.post(`${API_URL}/notes/${id}/generate-pdf`, {}, {
        headers: getAuthHeaders(),
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `note-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showMessage('PDF exported successfully!', 'success');
    } catch (err) {
      showMessage('Failed to export PDF');
    }
  };

  // Approve moderated note
  const handleApproveNote = async (id) => {
    try {
      await axios.put(`${API_URL}/notes/${id}/approve`, {}, {
        headers: getAuthHeaders()
      });
      
      setModeratedNotes(moderatedNotes.filter(n => n._id !== id));
      await fetchNotes();
      showMessage('Note approved successfully', 'success');
    } catch (err) {
      showMessage('Failed to approve note');
    }
  };

  // Login
  const handleLogin = async (email, password) => {
    try {
      setIsLoading(true);
      const res = await axios.post(`${API_URL}/login`, { email, password });
      
      const { token, user: userData } = res.data;
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      
      setAuthToken(token);
      setIsLoggedIn(true);
      setUser(userData);
      setShowLogin(true);
      
      showMessage('Login successful!', 'success');
    } catch (err) {
      showMessage(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Signup
  const handleSignup = async (formData) => {
    try {
      setIsLoading(true);
      const res = await axios.post(`${API_URL}/signup`, formData);
      
      showMessage('Signup successful! Please login.', 'success');
      setShowLogin(true);
    } catch (err) {
      showMessage(err.response?.data?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    setIsLoggedIn(false);
    setUser(null);
    setAuthToken('');
    setNotes([]);
    setFavoriteNotes([]);
    setArchivedNotes([]);
    setTrashedNotes([]);
    setCurrentView('notes');
    
    showMessage('Logged out successfully', 'success');
  };

  // Welcome page exit
  const handleWelcomeExit = () => {
    setShowWelcome(false);
  };

  // Search and filter functionality
  const getFilteredNotes = (notesList = notes) => {
    let filtered = notesList.filter(
      note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    switch (filterOption) {
      case 'recent':
        return [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      case 'oldest':
        return [...filtered].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      case 'longest':
        return [...filtered].sort((a, b) => b.content.length - a.content.length);
      case 'shortest':
        return [...filtered].sort((a, b) => a.content.length - b.content.length);
      default:
        return filtered;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  // Show Welcome first
  if (showWelcome) {
    return <Welcome onEnter={handleWelcomeExit} />;
  }

  // Login/Signup screen
  if (!isLoggedIn) {
    return showLogin ? (
      <Login 
        onToggle={() => setShowLogin(false)} 
        onLogin={handleLogin}
        isLoading={isLoading}
      />
    ) : (
      <Signup 
        onToggle={() => setShowLogin(true)} 
        onSignup={handleSignup}
        isLoading={isLoading}
      />
    );
  }

  // Main content renderer
  const renderContent = () => {
    switch (currentView) {
      case 'calendar':
        return <Calendar notes={notes} onEditNote={handleEditNote} />;
      case 'reminder':
        return <Reminder />;
      case 'settings':
        return <Settings user={user} onUserUpdate={setUser} />;
      case 'search':
        return <PublicNotesSearch />;
      case 'favorites':
        return renderNotesView(favoriteNotes, 'favorites');
      case 'archive':
        return renderNotesView(archivedNotes, 'archive');
      case 'trash':
        return renderTrashView();
      case 'tags':
        return renderTagsView();
      case 'moderated':
        return renderModeratedView();
      default:
        return renderNotesView(notes, 'notes');
    }
  };

  // UPDATED AI Features component - simplified to only use topic
  const renderAIFeatures = () => (
    <div className="ai-features">
      <h3>AI Note Generation</h3>
      <div className="ai-form-simplified">
        <div className="form-group">
          <label className="form-label">Topic</label>
          <input
            type="text"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            placeholder="Enter any study topic (e.g., Physics Motion, Math Algebra, History World War)"
            className="form-input-topic"
          />
          <p className="topic-help-text">
            Enter any topic you want to study. AI will generate comprehensive notes for you.
          </p>
        </div>
        <button
          onClick={handleGenerateAINotes}
          disabled={isGeneratingAI}
          className="ai-generate-btn"
        >
          {isGeneratingAI ? 'Generating...' : 'Generate Notes'}
        </button>
      </div>
    </div>
  );

  const renderNotesView = (notesList, viewType) => {
    const filteredNotes = getFilteredNotes(notesList);

    return (
      <div className="notes-view">
  
        <div className="notes-container">
          {isLoading && (
            <div className="loading-state" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <p>Loading notes...</p>
            </div>
          )}
          
          {!isLoading && filteredNotes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3>No notes here!</h3>
              <p>
                {viewType === 'favorites' && 'No favorite notes yet.'}
                {viewType === 'archive' && 'No archived notes.'}
                {viewType === 'notes' && 'Create your first note to get started.'}
              </p>
            </div>
          ) : (
            <div className="notes-grid">
              {filteredNotes.map(note => (
                <div key={note._id} className={`note-card ${note.category}`}>
                  {note.aiGenerated && <div className="ai-badge">AI</div>}
                  {note.isModerated && (
                    <div className="moderation-warning">
                      <p>This note has been flagged for review</p>
                      {note.suggestedSubject && (
                        <p>Suggested subject: <span className="suggested-subject">{note.suggestedSubject}</span></p>
                      )}
                    </div>
                  )}
                  
                  <div className="note-header">
                    <h3 className="note-title">{note.title}</h3>
                    <div className="note-actions">
                      {viewType === 'notes' && (
                        <>
                          <button
                            onClick={() => handleToggleFavorite(note._id)}
                            className={`action-btn ${note.isFavorite ? 'favorite' : ''}`}
                            title="Toggle Favorite"
                          >
                            {note.isFavorite ? '⭐' : '☆'}
                          </button>
                          <button
                            onClick={() => handleEditNote(note)}
                            className="action-btn edit-btn"
                            title="Edit Note"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleArchiveNote(note._id)}
                            className="action-btn archive-btn"
                            title="Archive Note"
                          >
                            📦
                          </button>
                          <button
                            onClick={() => handleExportPDF(note._id)}
                            className="action-btn export-btn"
                            title="Export as PDF"
                          >
                            📄
                          </button>
                        </>
                      )}
                      {viewType === 'archive' && (
                        <button
                          onClick={() => handleRestoreFromArchive(note._id)}
                          className="action-btn restore-btn"
                          title="Restore from Archive"
                        >
                          📤
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(note._id)}
                        className="action-btn delete-btn"
                        title="Move to Trash"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <p className="note-content">{note.content}</p>
                  
                  {note.tags && note.tags.length > 0 && (
                    <div className="note-tags">
                      {note.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  
                  <div className="note-footer">
                    <span className="note-category">{note.category}</span>
                    <span className="note-timestamp">
                      {formatTimestamp(note.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTrashView = () => (
    <div className="trash-view">
      <div className="trash-header">
        <h2>Trash</h2>
        <p>Notes will be permanently deleted after 30 days</p>
      </div>
      <div className="notes-container">
        {trashedNotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗑️</div>
            <h3>Trash is empty</h3>
            <p>Deleted notes will appear here</p>
          </div>
        ) : (
          <div className="notes-grid">
            {trashedNotes.map(note => (
              <div key={note._id} className="note-card trashed">
                <h3 className="note-title">{note.title}</h3>
                <p className="note-content">{note.content}</p>
                <div className="note-actions" style={{ marginTop: '12px' }}>
                  <button
                    onClick={() => handleRestoreNote(note._id)}
                    className="restore-btn"
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginRight: '8px'
                    }}
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(note._id)}
                    className="permanent-delete-btn"
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderTagsView = () => {
    const tagCounts = {};
    notes.forEach(note => {
      note.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return (
      <div className="tags-view">
        <div className="tags-header">
          <h2>Tags</h2>
          <p>Organize your notes with tags</p>
        </div>
        <div className="tags-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
          padding: '20px'
        }}>
          {Object.entries(tagCounts).map(([tag, count]) => (
            <div key={tag} className="tag-card" style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              textAlign: 'center'
            }}>
              <span className="tag-name" style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '8px'
              }}>{tag}</span>
              <span className="tag-count" style={{
                fontSize: '14px',
                color: '#6b7280'
              }}>{count} notes</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderModeratedView = () => (
    <div className="moderated-view">
      <div className="moderated-header">
        <h2>Moderated Notes</h2>
        <p>Notes flagged for review</p>
      </div>
      <div className="notes-container">
        {moderatedNotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <h3>No moderated notes</h3>
            <p>All notes are approved</p>
          </div>
        ) : (
          <div className="notes-grid">
            {moderatedNotes.map(note => (
              <div key={note._id} className="note-card moderated" style={{
                borderLeft: '4px solid #f59e0b',
                background: '#fffbf0'
              }}>
                <div className="moderation-warning">
                  <p>Flagged: {note.moderationFlags.join(', ')}</p>
                  <p>Content Score: {(note.contentScore * 100).toFixed(0)}%</p>
                  {note.suggestedSubject && (
                    <p>Suggested Subject: <span className="suggested-subject">{note.suggestedSubject}</span></p>
                  )}
                </div>
                
                <h3 className="note-title">{note.title}</h3>
                <p className="note-content">{note.content}</p>
                
                <div className="moderation-actions" style={{ marginTop: '16px' }}>
                  <button
                    onClick={() => handleApproveNote(note._id)}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginRight: '8px'
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDelete(note._id)}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Main app render
  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Global Messages */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#fee2e2',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #fecaca',
          zIndex: 10000,
          maxWidth: '400px'
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#dcfce7',
          color: '#16a34a',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #bbf7d0',
          zIndex: 10000,
          maxWidth: '400px'
        }}>
          {success}
        </div>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            <img src={logo} alt="NoteCraftr Logo" className="logo-icon" />
            NoteCraftr
          </h2>
          <button 
            className="sidebar-close"
            onClick={() => setIsSidebarOpen(false)}
          >
            ✖️
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${currentView === 'notes' ? 'active' : ''}`}
            onClick={() => setCurrentView('notes')}
          >
            <MdArticle className="nav-item-icon" /> All Notes
          </button>
          <button
            className={`nav-item ${currentView === 'favorites' ? 'active' : ''}`}
            onClick={() => setCurrentView('favorites')}
          >
            <MdStarBorder className="nav-item-icon" /> Favorites
          </button>
          <button
            className={`nav-item ${currentView === 'calendar' ? 'active' : ''}`}
            onClick={() => setCurrentView('calendar')}
          >
            <MdCalendarToday className="nav-item-icon" /> Calendar
          </button>
          <button
            className={`nav-item ${currentView === 'reminder' ? 'active' : ''}`}
            onClick={() => setCurrentView('reminder')}
          >
            <MdAlarm className="nav-item-icon" /> Reminders
          </button>
          <button
            className={`nav-item ${currentView === 'tags' ? 'active' : ''}`}
            onClick={() => setCurrentView('tags')}
          >
            <MdLabelOutline className="nav-item-icon" /> Tags
          </button>
          <button
            className={`nav-item ${currentView === 'search' ? 'active' : ''}`}
            onClick={() => setCurrentView('search')}
          >
            <MdSearch className="nav-item-icon" /> Search Public
          </button>
          <button
            className={`nav-item ${currentView === 'archive' ? 'active' : ''}`}
            onClick={() => setCurrentView('archive')}
          >
            <MdArchive className="nav-item-icon" /> Archive
          </button>
          <button
            className={`nav-item ${currentView === 'trash' ? 'active' : ''}`}
            onClick={() => setCurrentView('trash')}
          >
            <MdDeleteOutline className="nav-item-icon" /> Trash
          </button>
          <button
            className={`nav-item ${currentView === 'moderated' ? 'active' : ''}`}
            onClick={() => setCurrentView('moderated')}
          >
            <MdWarningAmber className="nav-item-icon" /> Moderated
          </button>
          <button
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentView('settings')}
          >
            <MdSettings className="nav-item-icon" /> Settings
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="main-content">
        {/* Header */}
        <div className="app-header">
          <div className="header-left">
            <button 
              className="hamburger-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              ☰
            </button>
            <h1 className="app-title">
              <img src={logo} alt="NoteCraftr Logo" className="logo-icon" />
              NoteCraftr
            </h1>
          </div>
          <div className="header-right">
            <p className="welcome-text">Welcome back, {user?.firstName || 'User'}!</p>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="controls-section">
          <div className="search-filter-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search your notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="filter-select"
              value={filterOption}
              onChange={(e) => setFilterOption(e.target.value)}
            >
              <option value="none">All Notes</option>
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="longest">Longest Notes</option>
              <option value="shortest">Shortest Notes</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        {renderContent()}
      </div>

      {/* Floating Add Button */}
      {currentView === 'notes' && !showCreateModal && (
        <button
          className="floating-add-btn"
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          title="Create Note"
        >
          ➕
        </button>
      )}

      <CreateNoteModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
          setShowAIFeatures(false);
        }}
        title={title}
        content={content}
        selectedTag={selectedTag}
        noteCategory={noteCategory}
        availableTags={availableTags}
        availableCategories={availableCategories}
        onTitleChange={(value) => setTitle(value)}
        onContentChange={(value) => setContent(value)}
        onTagChange={(value) => setSelectedTag(value)}
        onCategoryChange={(value) => setNoteCategory(value)}
        onSubmit={handleAddNote}
        onCancelEdit={resetForm}
        editingNote={editingNote}
        isLoading={isLoading}
        showAIFeatures={showAIFeatures}
        setShowAIFeatures={setShowAIFeatures}
        aiTopic={aiTopic}
        setAiTopic={setAiTopic}
        onGenerateAI={handleGenerateAINotes}
        apiUrl={API_URL}
        onActionComplete={fetchNotes}
      />

      {/* Sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default App;