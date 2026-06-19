import { Route, Routes } from "react-router-dom";
import AdminDashboard from "../pages/dashboard/AdminDashboard";
import FacultyDashboard from "../pages/dashboard/FacultyDashboard";
import StudentDashboard from "../pages/dashboard/StudentDashboard";
import HomePage from "../pages/HomePage";
import AdminLogin from "../pages/login/AdminLogin";
import FacultyLogin from "../pages/login/FacultyLogin";
import StudentLogin from "../pages/login/StudentLogin";
import StudentAccountPage from "../pages/account/StudentAccountPage";
import AdminAccountPage from "../pages/account/AdminAccountPage";
import FacultyAccountPage from "../pages/account/FacultyAccountPage";
import AdminProblemList from "../pages/problems/AdminProblemList";
import AdminProblemCreate from "../pages/problems/AdminProblemCreate";
import AdminProblemDetails from "../pages/problems/AdminProblemDetails";
import AdminStudentList from "../pages/admin/AdminStudentList";
import AdminStudentSubmissions from "../pages/admin/AdminStudentSubmissions";
import AdminCourseManager from "../pages/courses/AdminCourseManager";
import FacultyCourseDetails from "../pages/courses/FacultyCourseDetails";
import StudentCourseDetails from "../pages/courses/StudentCourseDetails";
import StudentCourseList from "../pages/courses/StudentCourseList";
import StudentProblemList from "../pages/problems/StudentProblemList";
import StudentProblemDetails from "../pages/problems/StudentProblemDetails";

function NotFoundPage() {
  return (
    <main className="route-status-page">
      <p className="route-status-label">404</p>
      <h1>Page not found</h1>
      <p>The route you requested does not exist yet.</p>
    </main>
  );
}

export default function MainRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/studentLogin" element={<StudentLogin />} />
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/student/courses" element={<StudentCourseList />} />
      <Route path="/student/courses/:courseId" element={<StudentCourseDetails />} />
      <Route path="/student/account" element={<StudentAccountPage />} />
      <Route path="/student/problems" element={<StudentProblemList />} />
      <Route path="/student/problems/:problemId" element={<StudentProblemDetails />} />
      <Route path="/studentDashboard" element={<StudentDashboard />} />
      <Route path="/faculty/login" element={<FacultyLogin />} />
      <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
      <Route path="/faculty/courses" element={<FacultyDashboard />} />
      <Route path="/faculty/courses/:courseId" element={<FacultyCourseDetails />} />
      <Route path="/faculty/account" element={<FacultyAccountPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/courses" element={<AdminCourseManager />} />
      <Route path="/admin/account" element={<AdminAccountPage />} />
      <Route path="/admin/problems/new" element={<AdminProblemCreate />} />
      <Route path="/admin/problems" element={<AdminProblemList />} />
      <Route path="/admin/problems/:problemId" element={<AdminProblemDetails />} />
      <Route path="/admin/students" element={<AdminStudentList />} />
      <Route path="/admin/students/:studentId/submissions" element={<AdminStudentSubmissions />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
