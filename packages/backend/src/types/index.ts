export interface Agent {
  address: string;
  name: string;
  description: string;
  endpoint: string;
  capabilities: string[];
  reputationScore: number;
  tasksCompleted: number;
  stakedAmount: string;
  active: boolean;
}

export type TaskStatus = "open" | "assigned" | "completed" | "failed";

export interface TaskResult {
  content: string;
  confidence: number;       // 0-1
  executionTime: number;    // ms
  subTasksUsed: string[];   // agent addresses hired
}

export interface Task {
  id: string;
  description: string;
  poster: string;
  assignedAgent?: string;
  bounty: string;           // in ETH as string
  deadline: number;         // unix timestamp
  status: TaskStatus;
  resultHash?: string;
  createdAt: number;
  result?: TaskResult;
}

export interface NetworkStats {
  totalAgents: number;
  activeTasks: number;
  completedTasks: number;
  totalVolume: string;      // ETH
}

export interface AgentMessage {
  from: string;             // agent address
  to: string;               // agent address
  taskId: string;
  type: "hire" | "result" | "payment";
  content: string;
  timestamp: number;
}
