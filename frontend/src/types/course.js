export const branchOptions = ["CSE", "IT", "ECE", "EEE", "ME", "CE"];
export const sectionOptions = ["A", "B", "C", "D"];

export function buildSemesterOptions(limit = 8) {
  return Array.from({ length: limit }, (_value, index) => index + 1);
}
