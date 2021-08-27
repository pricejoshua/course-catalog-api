const filters = {
  campus: (campus) => true,
  subject: (subject) => ["CS"].includes(subject),
  courseNumber: (courseNumber) => courseNumber <= 3000,
  truncate: true,
};

export default filters;
