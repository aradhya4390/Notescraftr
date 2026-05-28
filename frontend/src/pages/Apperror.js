// src/AppError.js
import React from 'react';
import { Link } from 'react-router-dom';

export default function AppError() {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f8d7da",
      color: "#721c24",
      textAlign: "center"
    }}>
      <h1 style={{ fontSize: "5rem", marginBottom: "10px" }}>404</h1>
      <h2>Oops! Page not found.</h2>
      <p>The page you are looking for doesn’t exist.</p>
      <Link to="/" style={{
        marginTop: "20px",
        padding: "10px 20px",
        backgroundColor: "#721c24",
        color: "white",
        borderRadius: "5px",
        textDecoration: "none"
      }}>
        Go Back Home
      </Link>
    </div>
  );
}
