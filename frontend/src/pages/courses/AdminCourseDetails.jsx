import CourseWorkspace from "./CourseWorkspace";
import { getAdminSession } from "../../utils/session";

export default function AdminCourseDetails() {
  return <CourseWorkspace role="admin" session={getAdminSession()} />;
}
