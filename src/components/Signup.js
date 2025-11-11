import React, { useState } from 'react';
import axios from 'axios';
import './auth.css';

function Signup({ onToggle, onSignup }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear message when user starts typing
    if (message) setMessage('');
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setMessage("First name is required!");
      return false;
    }
    if (!formData.lastName.trim()) {
      setMessage("Last name is required!");
      return false;
    }
    if (!formData.email.trim()) {
      setMessage("Email is required!");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match!");
      return false;
    }
    if (formData.password.length < 6) {
      setMessage("Password must be at least 6 characters long!");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setMessage('');

    try {
      console.log('Sending signup request with data:', formData); // Debug log
      
      const res = await axios.post('http://localhost:5000/api/signup', formData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('Signup response:', res); // Debug log
      
      if (res.status === 200 || res.status === 201) {
        setMessage("Signup Successful! Please login.");
        // Clear form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        setTimeout(() => {
          onToggle();
        }, 2000);
      } else {
        setMessage("Signup Failed! Please try again.");
      }
    } catch (err) {
      console.error('Signup error:', err); // Debug log
      
      if (err.code === 'ECONNABORTED') {
        setMessage("Connection timeout! Please check if the server is running.");
      } else if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        setMessage("Cannot connect to server! Please ensure backend is running on port 5000.");
      } else if (err.response) {
        // Server responded with error
        setMessage(err.response.data?.message || `Server Error: ${err.response.status}`);
      } else {
        setMessage("Network error! Please check your internet connection.");
      }
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
      
      <div className="auth-card signup-card">
        <div className="auth-header">
          <h2 className="auth-title"> Join NoteCraftr</h2>
          <p className="auth-subtitle">Create your account and start taking notes</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="name-row">
            <div className="input-group">
              <div className="input-icon"></div>
              <input
                type="text"
                className="auth-input"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <div className="input-icon"></div>
              <input
                type="text"
                className="auth-input"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <div className="input-icon"></div>
            <input
              type="email"
              className="auth-input"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <div className="input-icon"></div>
            <input
              type="password"
              className="auth-input"
              name="password"
              placeholder="Create password (min 6 chars)"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <div className="input-icon"></div>
            <input
              type="password"
              className="auth-input"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
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
                Creating Account...
              </>
            ) : (
              ' Create Account'
            )}
          </button>
        </form>

        {message && (
          <div className={`auth-message ${message.includes('Success') ? 'success' : 'error'}`}>
            {message.includes('Success') ? '✅' : '❌'} {message}
          </div>
        )}

        <div className="auth-footer">
          <p>Already have an account?</p>
          <button onClick={onToggle} className="auth-link">
            Sign In 
          </button>
        </div>
      </div>
    </div>
  );
}

export default Signup;