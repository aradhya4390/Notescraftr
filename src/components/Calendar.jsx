import React from 'react';

export default function Calendar({ notes, onEditNote }) {
  return (
    <div>
      <h2>📅 Calendar View</h2>
      {notes && notes.length > 0 ? (
        <ul>
          {notes.map(note => (
            <li key={note._id} onClick={() => onEditNote(note)}>
              <strong>{note.title}</strong> - {new Date(note.timestamp).toLocaleDateString()}
            </li>
          ))}
        </ul>
      ) : (
        <p>No notes to display on Calendar</p>
      )}
    </div>
  );
}
