export function getReportLocale(language) {
  if (language === "th") return "th-TH";
  if (language === "ko") return "ko-KR";
  return "en-US";
}

export function formatReportNumber(value, language, options) {
  return new Intl.NumberFormat(getReportLocale(language), options).format(Number(value || 0));
}

export function formatReportDate(value, language, options = { dateStyle: "medium" }) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(getReportLocale(language), options).format(date);
}
