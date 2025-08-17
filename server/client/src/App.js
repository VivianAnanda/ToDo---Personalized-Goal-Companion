import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoginForm from "./LoginForm";
import GoalForm from "./GoalForm";
import RegistrationForm from "./RegistrationForm";

const RequireAuth = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));

  useEffect(() => {
    const syncAuth = () => setIsAuthenticated(!!localStorage.getItem("token"));
    window.addEventListener("storage", syncAuth); // sync across tabs
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/goals" replace />
            ) : (
              <LoginForm onLogin={() => setIsAuthenticated(true)} />
            )
          }
        />
        <Route path="/register" element={<RegistrationForm />} />
        <Route
          path="/goals"
          element={
            <RequireAuth>
              <GoalForm onLogout={() => setIsAuthenticated(false)} />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
