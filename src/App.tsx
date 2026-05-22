import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import CourseList from './pages/CourseList';
import CourseDetail from './pages/CourseDetail';
import NotesList from './pages/NotesList';
import NoteEditor from './pages/NoteEditor';
import ProfilePage from './pages/ProfilePage';
import { SlideViewer } from './components/SlideViewer';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      
      {/* App Shell Routes */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/courses" element={<CourseList />} />
        <Route path="/course/:id" element={<CourseDetail />} />
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
    </Routes>
  );
}
