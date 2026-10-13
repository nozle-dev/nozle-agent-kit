export type GoalId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface TaskInput {
  id: string;
  label: string;
  goals: GoalId[];
  dependsOn?: string[];
  required?: boolean;
}

export interface PreparedTask {
  id: string;
  label: string;
  goals: GoalId[];
  dependsOn: string[];
  required: boolean;
}

export interface PreparedPlan {
  selectedGoals: GoalId[];
  tasks: PreparedTask[];
}

export type TaskStatus = "pending" | "active" | "completed" | "failed" | "blocked" | "deferred";

export interface TaskResult {
  status: "active" | "completed" | "failed" | "deferred";
  evidence?: string;
  reason?: string;
}

export interface TaskProgress extends PreparedTask {
  status: TaskStatus;
  evidence?: string;
  reason?: string;
}

export interface PlanProgress {
  tasks: TaskProgress[];
  completed: number;
  total: number;
  ready: boolean;
}

export function mergeTasks(tasks: TaskInput[]): TaskInput[] {
  const merged = new Map<string, TaskInput>();
  for (const task of tasks) {
    const prior = merged.get(task.id);
    if (!prior) {
      merged.set(task.id, { ...task });
      continue;
    }
    if (prior.label !== task.label) throw new Error(`Task ${task.id} has conflicting labels`);
    merged.set(task.id, {
      ...prior,
      goals: [...new Set([...prior.goals, ...task.goals])],
      dependsOn: [...new Set([...(prior.dependsOn ?? []), ...(task.dependsOn ?? [])])],
      required: (prior.required ?? true) || (task.required ?? true),
    });
  }
  return [...merged.values()];
}

export function preparePlan(input: { selectedGoals: GoalId[]; tasks: TaskInput[] }): PreparedPlan {
  const selectedGoals = [...new Set(input.selectedGoals)];
  if (selectedGoals.length === 0) throw new Error("Select at least one integration goal");
  if (selectedGoals.some((goal) => !Number.isInteger(goal) || goal < 1 || goal > 10)) {
    throw new Error("Integration goals must be options 1 through 10");
  }
  if (input.tasks.length === 0) throw new Error("Plan needs at least one task");
  const selected = new Set<GoalId>(selectedGoals);
  const tasksById = new Map<string, PreparedTask>();

  for (const task of input.tasks) {
    if (tasksById.has(task.id)) throw new Error(`Duplicate task ID ${task.id}`);
    for (const goal of task.goals) {
      if (!selected.has(goal)) throw new Error(`Task ${task.id} refers to unselected goal ${goal}`);
    }
    tasksById.set(task.id, {
      id: task.id,
      label: task.label,
      goals: [...new Set(task.goals)],
      dependsOn: [...new Set(task.dependsOn ?? [])],
      required: task.required ?? true,
    });
  }

  for (const task of tasksById.values()) {
    for (const dependency of task.dependsOn) {
      if (!tasksById.has(dependency)) throw new Error(`Task ${task.id} depends on unknown task ${dependency}`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: PreparedTask[] = [];

  function visit(task: PreparedTask): void {
    if (visiting.has(task.id)) throw new Error("Task dependencies contain a cycle");
    if (visited.has(task.id)) return;
    visiting.add(task.id);
    for (const id of task.dependsOn) visit(tasksById.get(id)!);
    visiting.delete(task.id);
    visited.add(task.id);
    ordered.push(task);
  }

  for (const task of tasksById.values()) visit(task);
  return { selectedGoals, tasks: ordered };
}

export function progressFor(plan: PreparedPlan, results: Record<string, TaskResult>): PlanProgress {
  const tasks: TaskProgress[] = [];
  const byId = new Map<string, TaskProgress>();

  for (const task of plan.tasks) {
    const result = results[task.id];
    if (result?.status === "completed" && !result.evidence?.trim()) {
      throw new Error(`Completed task ${task.id} has no verification evidence`);
    }
    if ((result?.status === "failed" || result?.status === "deferred") && !result.reason?.trim()) {
      throw new Error(`${result.status} task ${task.id} has no reason`);
    }
    if (result?.status === "completed" || result?.status === "active") {
      for (const id of task.dependsOn) {
        if (byId.get(id)?.status !== "completed") {
          const verb = result.status === "active" ? "be active" : "complete";
          throw new Error(`Task ${task.id} cannot ${verb} before dependency ${id}`);
        }
      }
    }

    const dependencyBlocked = task.dependsOn.some((id) => {
      const status = byId.get(id)?.status;
      return status === "failed" || status === "blocked" || status === "deferred";
    });
    const progress: TaskProgress = {
      ...task,
      status: dependencyBlocked ? "blocked" : (result?.status ?? "pending"),
      ...(dependencyBlocked ? {} : { evidence: result?.evidence, reason: result?.reason }),
    };
    tasks.push(progress);
    byId.set(task.id, progress);
  }

  return {
    tasks,
    completed: tasks.filter((task) => task.status === "completed").length,
    total: tasks.length,
    ready: tasks.filter((task) => task.required).every((task) => task.status === "completed"),
  };
}
