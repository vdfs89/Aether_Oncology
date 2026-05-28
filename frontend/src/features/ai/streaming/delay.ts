/**
 * src/features/ai/streaming/delay.ts
 * 
 * Utility to simulate network latency.
 */

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const randomDelay = (min: number, max: number) => 
  delay(Math.floor(Math.random() * (max - min + 1)) + min)
