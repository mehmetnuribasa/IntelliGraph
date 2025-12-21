export const formatDate = (dateString: any) => {
  if (!dateString) return 'N/A';
  try {
    // Handle Neo4j object format (if returned as object)
    if (typeof dateString === 'object' && dateString.year && dateString.month && dateString.day) {
      const year = typeof dateString.year === 'object' ? dateString.year.low : dateString.year;
      const month = typeof dateString.month === 'object' ? dateString.month.low : dateString.month;
      const day = typeof dateString.day === 'object' ? dateString.day.low : dateString.day;
      return new Date(year, month - 1, day).toLocaleDateString();
    }

    let date;
    if (typeof dateString === 'string') {
       // Truncate nanoseconds to milliseconds (more robust regex)
       // Matches .123456... and keeps .123
       const cleanDate = dateString.replace(/(\.\d{3})\d+/, '$1');
       date = new Date(cleanDate);
    } else {
       date = new Date(dateString);
    }
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
  } catch (error) {
    return 'Invalid Date';
  }
};
