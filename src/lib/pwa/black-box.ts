/**
 * Clinical PWA Black Box
 * 
 * A persistent event logger that survives browser crashes and reloads.
 * This helps diagnose infinite loops and OOM (Out of Memory) crashes on iOS.
 */

const LOG_KEY = 'app_black_box_logs';
const MAX_LOGS = 100;

export interface LogEntry {
  t: string; // timestamp
  m: string; // message
  d?: any;   // data
}

/**
 * Add a message to the persistent clinical log.
 */
export function logEvent(message: string, data?: any) {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(LOG_KEY);
    let logs: LogEntry[] = raw ? JSON.parse(raw) : [];
    
    const entry: LogEntry = {
      t: new Date().toISOString(),
      m: message,
      d: data
    };
    
    // Add to front (newest first)
    logs.unshift(entry);
    
    // Cap size
    if (logs.length > MAX_LOGS) {
      logs = logs.slice(0, MAX_LOGS);
    }
    
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    
    // Also log to console for development
    console.debug(`[BlackBox] ${message}`, data || '');
  } catch (e) {
    console.error('BlackBox logging failed', e);
  }
}

/**
 * Convenience helper to read the log (for debugging)
 */
export function getLogs(): LogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear the log manually
 */
export function clearLogs() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOG_KEY);
}
