/** Stored in profiles.age: 0 = &lt;18, 18–99 = actual age, null = unset */
export const PROFILE_AGE_UNDER_18 = 0;

export const PROFILE_AGE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "請選擇" },
  { value: String(PROFILE_AGE_UNDER_18), label: "<18" },
  ...Array.from({ length: 99 - 18 + 1 }, (_, i) => {
    const age = i + 18;
    return { value: String(age), label: String(age) };
  }),
];

export function formatProfileAge(age: number | null | undefined): string | null {
  if (age == null) return null;
  if (age === PROFILE_AGE_UNDER_18) return "<18";
  if (age >= 18 && age <= 99) return String(age);
  return null;
}

/** Display on profile / network stats row, e.g. "18 y/o" or "<18 y/o". */
export function formatProfileAgeForStats(age: number | null | undefined): string | null {
  const label = formatProfileAge(age);
  if (!label) return null;
  return `${label} y/o`;
}

export function parseProfileAgeInput(value: string): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n === PROFILE_AGE_UNDER_18) return PROFILE_AGE_UNDER_18;
  if (n >= 18 && n <= 99) return n;
  return null;
}
