import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import EnterpriseDashboard from './pages/EnterpriseDashboard';
import BDDashboard from './pages/BDDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ProjectDetail from './pages/ProjectDetail';
import BDProfile from './pages/BDProfile';
import AIReport from './pages/AIReport';
import { AuthProvider, useAuth } from './hooks/useAuth';

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/enterprise/*" element={
          <ProtectedRoute role="enterprise">
            <EnterpriseDashboard />
          </ProtectedRoute>
        } />
        <Route path="/bd/*" element={
          <ProtectedRoute role="bd">
            <BDDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/bd-profile/:id" element={<BDProfile />} />
        <Route path="/ai-report/:bdId" element={<AIReport />} />
        <Route path="/" element={
          user ? (
            user.role === 'enterprise' ? <Navigate to="/enterprise" /> :
            user.role === 'bd' ? <Navigate to="/bd" /> :
            <Navigate to="/admin" />
          ) : <Navigate to="/login" />
        } />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
