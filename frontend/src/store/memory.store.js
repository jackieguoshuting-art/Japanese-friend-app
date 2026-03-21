export const memoryStore = { yuki: [], ren: [], hana: [] };

// 30% chance to surface a memory — keeps references feeling natural, not robotic
export function shouldUseMemory() {
  return Math.random() < 0.3;
}
