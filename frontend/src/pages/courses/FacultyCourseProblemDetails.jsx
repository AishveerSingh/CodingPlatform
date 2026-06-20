import CourseProblemWorkspace from "./CourseProblemWorkspace";
import { getFacultySession } from "../../utils/session";

export default function FacultyCourseProblemDetails() {
  return <CourseProblemWorkspace role="faculty" session={getFacultySession()} />;
}
