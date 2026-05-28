import { useState, useEffect } from 'react';
import './Welcome.css';

function Welcome({ onEnter }) {
  const [isVisible, setIsVisible] = useState(false);
  const [textIndex, setTextIndex] = useState(0);

  const welcomeTexts = [
    "Capture Your Ideas",
    "Organize Your Thoughts",
    "Create Amazing Notes",
    "Welcome to NoteCraftr"
  ];

  useEffect(() => {
  const timer = setTimeout(() => setIsVisible(true), 500);

  const textInterval = setInterval(() => {
    setTextIndex((prev) => (prev + 1) % welcomeTexts.length);
  }, 2000);

  return () => {
    clearTimeout(timer);
    clearInterval(textInterval);
  };
}, [welcomeTexts.length]); // ✅ Add dependency for ESLint satisfaction

const handleClick = () => {
  setIsVisible(false);
  setTimeout(() => {
    if (onEnter) onEnter();
  }, 800);
};
  return (
    <div className={`welcome-container ${isVisible ? 'visible' : ''}`} onClick={handleClick}>
      {/* Animated Background */}
      <div className="welcome-background">
        <div className="floating-orb orb-1"></div>
        <div className="floating-orb orb-2"></div>
        <div className="floating-orb orb-3"></div>
        <div className="floating-orb orb-4"></div>
        <div className="floating-orb orb-5"></div>
      </div>

      {/* Particles */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className={`particle particle-${i + 1}`}></div>
        ))}
      </div>

      {/* Main Content */}
      <div className="welcome-content">
        <div className="logo-container">
          <div className="logo-icon">📝</div>
          <div className="logo-rings">
            <div className="ring"></div>
            <div className="ring"></div>
            <div className="ring ring-3"></div>
          </div>
        </div>

        <h1 className="welcome-title">
          <span className="brand-name">NoteCraftr</span>
        </h1>

        <div className="rotating-text-container">
          <p className="rotating-text" key={textIndex}>
            {welcomeTexts[textIndex]}
          </p>
        </div>

        <div className="feature-highlights">
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span>Fast & Intuitive</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            <span>Secure & Private</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🌟</span>
            <span>Beautiful Design</span>
          </div>
        </div>

        <div className="cta-section">
          <div className="click-indicator">
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
            <span className="click-text">Click anywhere to continue</span>
          </div>
        </div>

        <div className="scroll-indicator">
          <div className="scroll-arrow"></div>
        </div>
      </div>

      {/* Version Info */}
      <div className="version-info">
        <span>v2.0 - Crafted with ❤️</span>
      </div>
    </div>
  );
}

export default Welcome;