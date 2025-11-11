import React, { useState, useRef } from 'react';
import './NotesView.css';

const NotesView = ({ availableTags = [], availableCategories = [] }) => {
  const [showNoteFields, setShowNoteFields] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [noteCategory, setNoteCategory] = useState(availableCategories[0] || '');

  const inputRef = useRef(null);

  const handleAddButtonClick = () => {
    setShowNoteFields(true);
    setTimeout(() => inputRef.current?.focus(), 100);  // Small delay to ensure input appears before focusing
  };

  return (
    <div className="notes-view">
      
      {!showNoteFields ? (
        // ➕ Floating Button Only Initially
        <button
          className="floating-add-btn"
          onClick={handleAddButtonClick}
          title="Add Note"
        >
          ➕
        </button>
      ) : (
        // Show Note Input Fields after Plus Button Click
        <div className="add-note-container">
          <input
            ref={inputRef}
            type="text"
            className="note-input"
            placeholder="Enter note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="note-input note-textarea"
            placeholder="Write your thoughts here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="note-options">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="tag-select"
            >
              <option value="">Select Tag</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <select
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value)}
              className="category-select"
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesView;

