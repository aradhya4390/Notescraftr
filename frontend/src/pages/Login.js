import React, { useState } from 'react';
import axios from 'axios';
import './auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://notescraftr-production.up.railway.app/api';

function Login({ onToggle, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setMessage('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      if (res.status === 200) {
        setMessage('Login Successful!');
        setTimeout(() => {
          onLogin(email, password);
        }, 1000);
      } else {
        setMessage('Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setMessage('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>
      
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title"> Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your NoteCraftr account</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="input-group">
            <div className="input-icon"></div>
            <input
              type="email"
              className="auth-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <div className="input-icon"></div>
            <input
              type="password"
              className="auth-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            className={`auth-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Signing in...
              </>
            ) : (
              ' Sign In'
            )}
          </button>
        </form>

        {message && (
          <div className={`auth-message ${message.includes('Success') ? 'success' : 'error'}`}>
            {message.includes('Success') ? '✅' : '❌'} {message}
          </div>
        )}

        <div className="auth-footer">
          <p>Don't have an account?</p>
          <button onClick={onToggle} className="auth-link">
            Create Account 
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;