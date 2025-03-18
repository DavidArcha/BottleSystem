import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UniqueIdService {
  private counter = 0;
  private prefix = 'acc-';

  /**
   * Generates a unique ID using timestamp, counter, and random number
   * Format: prefix-sessionId-timestamp-counter-random
   */
  generateId(customPrefix?: string): string {
    this.counter++;
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);

    // Get or create a session ID to help with persistence across page reloads
    let sessionId = sessionStorage.getItem('accordion-session-id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('accordion-session-id', sessionId);
    }

    return `${customPrefix || this.prefix}-${sessionId}-${timestamp}-${this.counter}-${random}`;
  }

  resetCounter(): void {
    this.counter = 0;
  }
}
