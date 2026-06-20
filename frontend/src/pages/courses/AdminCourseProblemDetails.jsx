import CourseProblemWorkspace from "./CourseProblemWorkspace";
import { getAdminSession } from "../../utils/session";

export default function AdminCourseProblemDetails() {
  return <CourseProblemWorkspace role="admin" session={getAdminSession()} />;
}
