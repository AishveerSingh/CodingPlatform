import { Route, Routes, Navigate, Outlet } from "react-router-dom";
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
import AdminFacultyList from "../pages/admin/AdminFacultyList";
import AdminAdminList from "../pages/admin/AdminAdminList";
import AdminCourseManager from "../pages/courses/AdminCourseManager";
import AdminCourseDetails from "../pages/courses/AdminCourseDetails";
import AdminCourseProblemDetails from "../pages/courses/AdminCourseProblemDetails";
import FacultyCourseDetails from "../pages/courses/FacultyCourseDetails";
import FacultyCourseProblemDetails from "../pages/courses/FacultyCourseProblemDetails";
import FacultyCourseList from "../pages/courses/FacultyCourseList";
import FacultyStudentList from "../pages/faculty/FacultyStudentList";
import FacultyStudentSubmissions from "../pages/faculty/FacultyStudentSubmissions";
import StudentCourseDetails from "../pages/courses/StudentCourseDetails";
import StudentCourseProblemDetails from "../pages/courses/StudentCourseProblemDetails";
import StudentCourseList from "../pages/courses/StudentCourseList";
import StudentProblemList from "../pages/problems/StudentProblemList";
import StudentProblemDetails from "../pages/problems/StudentProblemDetails";
import { getStudentSession, getFacultySession, getAdminSession } from "../utils/session";

function ProtectedRoute({ role }) {
  const session =
    role === "student"
      ? getStudentSession()
      : role === "faculty"
        ? getFacultySession()
        : role === "admin"
          ? getAdminSession()
          : null;

  if (!session || !session.token || session.user?.role !== role) {
    const loginPath =
      role === "admin"
        ? "/admin/login"
        : role === "faculty"
          ? "/faculty/login"
          : "/student/login";
    return <Navigate to={loginPath} replace />;
  }

  return <Outlet />;
}

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
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/studentLogin" element={<StudentLogin />} />
      <Route path="/faculty/login" element={<FacultyLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Student Protected Routes */}
      <Route element={<ProtectedRoute role="student" />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/courses" element={<StudentCourseList />} />
        <Route path="/student/courses/:courseId" element={<StudentCourseDetails />} />
        <Route path="/student/courses/:courseId/problems/:problemId" element={<StudentCourseProblemDetails />} />
        <Route path="/student/account" element={<StudentAccountPage />} />
        <Route path="/student/problems" element={<StudentProblemList />} />
        <Route path="/student/problems/:problemId" element={<StudentProblemDetails />} />
        <Route path="/studentDashboard" element={<StudentDashboard />} />
      </Route>

      {/* Faculty Protected Routes */}
      <Route element={<ProtectedRoute role="faculty" />}>
        <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
        <Route path="/faculty/courses" element={<FacultyCourseList />} />
        <Route path="/faculty/courses/:courseId" element={<FacultyCourseDetails />} />
        <Route path="/faculty/courses/:courseId/problems/:problemId" element={<FacultyCourseProblemDetails />} />
        <Route path="/faculty/students" element={<FacultyStudentList />} />
        <Route path="/faculty/students/:studentId/submissions" element={<FacultyStudentSubmissions />} />
        <Route path="/faculty/account" element={<FacultyAccountPage />} />
      </Route>

      {/* Admin Protected Routes */}
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/courses" element={<AdminCourseManager />} />
        <Route path="/admin/courses/:courseId" element={<AdminCourseDetails />} />
        <Route path="/admin/courses/:courseId/problems/:problemId" element={<AdminCourseProblemDetails />} />
        <Route path="/admin/account" element={<AdminAccountPage />} />
        <Route path="/admin/problems/new" element={<AdminProblemCreate />} />
        <Route path="/admin/problems" element={<AdminProblemList />} />
        <Route path="/admin/problems/:problemId" element={<AdminProblemDetails />} />
        <Route path="/admin/students" element={<AdminStudentList />} />
        <Route path="/admin/admins" element={<AdminAdminList />} />
        <Route path="/admin/faculty" element={<AdminFacultyList />} />
        <Route path="/admin/students/:studentId/submissions" element={<AdminStudentSubmissions />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
