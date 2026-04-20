import type { AppBackupData } from "../types/models";

const STORAGE_KEY = "sleekgeek.v1";

export function loadAppBackup(): AppBackupData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppBackupData;
  } catch {
    return null;
  }
}

export function saveAppBackup(data: AppBackupData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
