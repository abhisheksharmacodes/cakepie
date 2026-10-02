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
