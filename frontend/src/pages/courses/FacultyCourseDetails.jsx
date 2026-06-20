import CourseWorkspace from "./CourseWorkspace";
import { getFacultySession } from "../../utils/session";

export default function FacultyCourseDetails() {
  return <CourseWorkspace role="faculty" session={getFacultySession()} />;
}
