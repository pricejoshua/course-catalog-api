const filters = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  campus: (campus) => true,
  subject: (subject) => ["CSCI"].includes(subject),
  courseNumber: (courseNumber) => courseNumber >= 1,
  truncate: true,
};

export default filters;
