// Kept dependency-free so scripts can load it directly.

/** "1 day", "3 days", "1 Streak Shield". Pass `many` for irregular plurals. */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
