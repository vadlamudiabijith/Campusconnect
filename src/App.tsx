import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Dashboard } from './pages/Dashboard';
import { CourseHub } from './pages/courses/CourseHub';
import { CourseDetail } from './pages/courses/CourseDetail';
import { Issues } from './pages/Issues';
import { Clubs } from './pages/Clubs';
import { ClubDetail } from './pages/clubs/ClubDetail';
import { Events } from './pages/Events';
import { Timetable } from './pages/Timetable';
import { Attendance } from './pages/Attendance';
import { Feedback } from './pages/Feedback';
import { Visitors } from './pages/Visitors';
import { Payments } from './pages/Payments';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { ParentPortal } from './pages/ParentPortal';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 animate-pulse" />
        <p className="text-zinc-400 text-sm">Loading CampusPulse...</p>
      </div>
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="courses" element={<CourseHub />} />
      <Route path="courses/:id" element={<CourseDetail />} />
      <Route path="issues" element={<Issues />} />
      <Route path="clubs" element={<Clubs />} />
      <Route path="clubs/:id" element={<ClubDetail />} />
      <Route path="events" element={<Events />} />
      <Route path="timetable" element={<Timetable />} />
      <Route path="attendance" element={<Attendance />} />
      <Route path="feedback" element={<Feedback />} />
      <Route path="visitors" element={<Visitors />} />
      <Route path="payments" element={<Payments />} />
      <Route path="admin" element={<Admin />} />
      <Route path="profile" element={<Profile />} />
      <Route path="parent" element={<ParentPortal />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgba(24,24,27,0.95)',
                color: '#fff',
                border: '1px solid rgba(63,63,70,0.5)',
                borderRadius: '12px',
                fontSize: '14px',
                backdropFilter: 'blur(12px)',
              },
              success: {
                iconTheme: { primary: '#10B981', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#EF4444', secondary: '#fff' },
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
