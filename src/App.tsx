import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import CourseList from './pages/CourseList';
import ExploreCourses from './pages/ExploreCourses';
import CourseDetail from './pages/CourseDetail';
import MajorDetail from './pages/MajorDetail';
import NotesList from './pages/NotesList';
import NoteEditor from './pages/NoteEditor';
import ProfilePage from './pages/ProfilePage';
import { SlideViewer } from './components/SlideViewer';

// Admin System Imports
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import AdminLayout from './components/AdminLayout';
import AdminContentManager from './pages/admin/AdminContentManager';
import AdminExerciseBuilder from './pages/admin/AdminExerciseBuilder';
import StudentProgressView from './pages/admin/StudentProgressView';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      
      {/* App Shell Routes */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/courses" element={<CourseList />} />
        <Route path="/explore" element={<ExploreCourses />} />
        <Route path="/course/:id" element={<CourseDetail />} />
        <Route path="/major/:id" element={<MajorDetail />} />
        <Route path="/notes" element={<NotesList />} />
        <Route path="/notes/:id" element={<NoteEditor />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Full-screen Learning Experience */}
      <Route 
        path="/lesson/:lessonId" 
        element={
          <ProtectedRoute>
            <SlideViewer />
          </ProtectedRoute>
        } 
      />

      {/* Admin Dashboard Protected Routes Enclave */}
      <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
        <Route index element={<Navigate to="/admin/content-manager" replace />} />
        <Route path="content-manager" element={<AdminContentManager />} />
        <Route path="exercise-builder" element={<AdminExerciseBuilder />} />
        <Route path="student-analytics" element={<StudentProgressView />} />
      </Route>
    </Routes>
  );
}
