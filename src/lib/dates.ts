function parseToFullDate(dateIso: string): string {
  const parts = dateIso.split("-");
  const year = parts[0];
  const month = parts[1] ?? "01";
  const day = parts[2] ?? "01";
  return `${year}-${month}-${day}`;
}

function formatPartialDate(dateIso: string): string {
  const parts = dateIso.split("-");
  const year = parts[0];
  const month = parts[1];
  if (!month) return year;
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${monthNames[Number(month) - 1]} ${year}`;
}

export function calculateAge(birthDateIso: string, asOf: Date = new Date()): number {
  const birthDate = new Date(parseToFullDate(birthDateIso));
  let age = asOf.getFullYear() - birthDate.getFullYear();
  const hasNotHadBirthdayThisYear =
    asOf.getMonth() < birthDate.getMonth() ||
    (asOf.getMonth() === birthDate.getMonth() && asOf.getDate() < birthDate.getDate());
  if (hasNotHadBirthdayThisYear) {
    age -= 1;
  }
  return age;
}

export function yearsSince(dateIso: string, asOf: Date = new Date()): number {
  const startDate = new Date(parseToFullDate(dateIso));
  let years = asOf.getFullYear() - startDate.getFullYear();
  const hasNotReachedAnniversaryThisYear =
    asOf.getMonth() < startDate.getMonth() ||
    (asOf.getMonth() === startDate.getMonth() && asOf.getDate() < startDate.getDate());
  if (hasNotReachedAnniversaryThisYear) {
    years -= 1;
  }
  return years;
}

export function formatDateRange(
  startIso: string,
  endIso?: string,
  asOf: Date = new Date()
): string {
  const startLabel = formatPartialDate(startIso);
  if (!endIso) {
    const years = yearsSince(startIso, asOf);
    return `${startLabel} – Present (${years} ${years === 1 ? "yr" : "yrs"})`;
  }
  const endLabel = formatPartialDate(endIso);
  if (startLabel === endLabel) {
    return startLabel;
  }
  const years = yearsSince(startIso, new Date(parseToFullDate(endIso)));
  return `${startLabel} – ${endLabel} (${years} ${years === 1 ? "yr" : "yrs"})`;
}
