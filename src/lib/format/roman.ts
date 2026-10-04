const VALUES: Array<[number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** 1-indexed integer to roman numeral. Falls back to the plain number for n < 1. */
export function roman(n: number): string {
  if (n < 1) return String(n);
  let remaining = n;
  let out = "";
  for (const [value, symbol] of VALUES) {
    while (remaining >= value) {
      out += symbol;
      remaining -= value;
    }
  }
  return out;
}
