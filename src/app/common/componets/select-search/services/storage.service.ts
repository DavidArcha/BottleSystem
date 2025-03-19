import { Injectable } from '@angular/core';

/**
 * Service for handling storage operations with error handling and fallbacks
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  // Memory fallback when localStorage fails
  private memoryStore: Map<string, string> = new Map();

  // Flag to track if localStorage is available
  private localStorageAvailable: boolean;

  constructor() {
    // Check if localStorage is available
    this.localStorageAvailable = this.checkLocalStorageAvailable();
  }

  /**
   * Checks if localStorage is available and working
   */
  private checkLocalStorageAvailable(): boolean {
    const testKey = '__storage_test__';
    try {
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get item with error handling and fallback to memory store
   */
  getItem(key: string): string | null {
    if (this.localStorageAvailable) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        return this.memoryStore.get(key) || null;
      }
    } else {
      return this.memoryStore.get(key) || null;
    }
  }

  /**
   * Set item with error handling and fallback to memory store
   */
  setItem(key: string, value: string): void {
    // Store in memory regardless of localStorage availability
    this.memoryStore.set(key, value);

    // Try local storage if available
    if (this.localStorageAvailable) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        // Storage error occurred, but we already saved to memoryStore
        // Could log to monitoring service here
      }
    }
  }

  /**
   * Remove item with error handling
   */
  removeItem(key: string): void {
    // Remove from memory store
    this.memoryStore.delete(key);

    // Try remove from localStorage if available
    if (this.localStorageAvailable) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // Error handled silently, already removed from memory
      }
    }
  }

  /**
   * Clear all storage
   */
  clear(): void {
    // Clear memory store
    this.memoryStore.clear();

    // Try clear localStorage if available
    if (this.localStorageAvailable) {
      try {
        localStorage.clear();
      } catch (error) {
        // Error handled silently, already cleared memory
      }
    }
  }

  /**
   * Get boolean preference with default
   */
  getBoolPreference(key: string, defaultValue: boolean = false): boolean {
    const value = this.getItem(key);
    if (value === null) return defaultValue;
    return value === 'true';
  }

  /**
   * Set boolean preference
   */
  setBoolPreference(key: string, value: boolean): void {
    this.setItem(key, value.toString());
  }

  /**
   * Get JSON object with error handling
   */
  getObject<T>(key: string): T | null {
    const value = this.getItem(key);
    if (value === null) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set JSON object with error handling
   */
  setObject<T>(key: string, value: T): void {
    try {
      const jsonValue = JSON.stringify(value);
      this.setItem(key, jsonValue);
    } catch (error) {
      // Handle serialization errors silently
    }
  }
}
