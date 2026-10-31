export interface Task {
  id: string;
  name: string;
  color: string;
  createdAt?: string | Date;
  accumulatedTime?: number;
}

export interface TimeLog {
  id: string;
  taskId: string;
  startTime: string | number | Date;
  endTime?: string | number | Date | null;
  status: "running" | "completed";
}

export interface DailyTaskEntry {
  taskId?: string;
  taskName: string;
  color: string;
  duration: number; // in milliseconds
  formattedTime: string; // "HH:MM:SS"
}

export interface DailyRecord {
  id: string;
  date: string; // "YYYY-MM-DD"
  totalDuration: number; // in milliseconds
  formattedTotalTime: string; // "HH:MM:SS"
  taskEntries: DailyTaskEntry[];
  notes?: string;
  savedAt: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
