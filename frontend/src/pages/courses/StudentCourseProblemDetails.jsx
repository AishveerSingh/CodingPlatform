import CourseProblemWorkspace from "./CourseProblemWorkspace";
import { getStudentSession } from "../../utils/session";

export default function StudentCourseProblemDetails() {
  return <CourseProblemWorkspace role="student" session={getStudentSession()} />;
}
