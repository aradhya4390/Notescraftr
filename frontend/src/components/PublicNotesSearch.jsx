import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

function PublicNotesSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() && !subject.trim() && !tags.trim()) {
      setError('Please enter a search term, subject, or tags');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (subject.trim()) params.append('subject', subject.trim());
      if (tags.trim()) params.append('tags', tags.trim());

      const response = await axios.get(`${API_URL}/notes/search?${params}`);
      setSearchResults(response.data.notes);
    } catch (error) {
      console.error('Search error:', error);
      setError(error.response?.data?.message || 'Search failed');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSubject('');
    setTags('');
    setSearchResults([]);
    setError('');
  };

  return (
    <div className="public-notes-search" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>🔍 Search Public Notes</h2>
      <p>Discover notes shared by other users with public profiles</p>

      <form onSubmit={handleSearch} style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: '1', minWidth: '200px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <input
          type="text"
          placeholder="Subject (optional)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{ flex: '1', minWidth: '150px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <input
          type="text"
          placeholder="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          style={{ flex: '1', minWidth: '150px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
        <button
          type="button"
          onClick={clearSearch}
          style={{ padding: '8px 16px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Clear
        </button>
      </form>

      {error && <p style={{ color: 'red', marginBottom: '20px' }}>{error}</p>}

      <div className="search-results">
        {searchResults.length > 0 ? (
          <>
            <h3>Found {searchResults.length} note{searchResults.length !== 1 ? 's' : ''}</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              {searchResults.map(note => (
                <div key={note.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '15px', background: 'white' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>{note.title}</h4>
                  <p style={{ margin: '0 0 10px 0', color: '#6b7280', fontSize: '14px' }}>
                    By {note.author} • {new Date(note.updatedAt).toLocaleDateString()}
                  </p>
                  <p style={{ margin: '0 0 10px 0', color: '#374151' }}>{note.content}</p>
                  {note.tags.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      {note.tags.map(tag => (
                        <span key={tag} style={{ display: 'inline-block', background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginRight: '5px' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {(note.detectedSubject || note.suggestedSubject) && (
                    <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                      Subject: {note.detectedSubject || note.suggestedSubject}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : searchResults.length === 0 && !isLoading && (searchQuery || subject || tags) ? (
          <p>No notes found matching your search criteria.</p>
        ) : null}
      </div>
    </div>
  );
}

export default PublicNotesSearch;