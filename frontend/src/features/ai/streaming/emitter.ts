/**
 * src/features/ai/streaming/emitter.ts
 * 
 * Simple event emitter to handle streaming chunks decoupled from React components.
 */

type Listener<T> = (data: T) => void

export class StreamingEmitter<T> {
  private listeners: Set<Listener<T>> = new Set()

  on(listener: Listener<T>) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(data: T) {
    this.listeners.forEach(l => l(data))
  }
}
