import React from 'react';
export default function Settings({ user }) {
  return <h2>⚙️ Settings for {user?.firstName || 'User'}</h2>;
}
