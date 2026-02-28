export function formatDateYYYYMMDD(d: Date): string {
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats a Date using a unicode date/time pattern string.
 * Supported tokens: yyyy, MM, dd, HH, mm, ss, xxx (+01:00), xx (+0100), x (+1)
 */
export function formatDate(d: Date, format: string): string {
  const yyyy = String(d.getFullYear());
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const absOff = Math.abs(offset);
  const offH = String(Math.floor(absOff / 60)).padStart(2, "0");
  const offM = String(absOff % 60).padStart(2, "0");
  const xxx = `${sign}${offH}:${offM}`; // +01:00
  const xx = `${sign}${offH}${offM}`; // +0100
  const x = offM === "00" ? `${sign}${String(Math.floor(absOff / 60))}` : xx; // +1 or +0530

  return format
    .replace("yyyy", yyyy)
    .replace("MM", MM)
    .replace("dd", dd)
    .replace("HH", HH)
    .replace("xxx", xxx)
    .replace("xx", xx)
    .replace("x", x)
    .replace("ss", ss)
    .replace("mm", mi);
}
