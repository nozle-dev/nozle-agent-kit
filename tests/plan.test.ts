import { describe, expect, test } from "bun:test";

import { mergeTasks, preparePlan, progressFor, type TaskInput } from "../src/plan.ts";

describe("preparePlan", () => {
  test("keeps selected goals and runs shared prerequisites once", () => {
    const tasks: TaskInput[] = [
      { id: "checkout", label: "Add checkout", goals: [2], dependsOn: ["identity"] },
      { id: "identity", label: "Map authenticated customer identity", goals: [2, 5] },
      { id: "meter", label: "Track approved usage", goals: [5], dependsOn: ["identity"] },
    ];

    const plan = preparePlan({ selectedGoals: [5, 2, 5], tasks });

    expect(plan.selectedGoals).toEqual([5, 2]);
    expect(plan.tasks.map((task) => task.id)).toEqual(["identity", "checkout", "meter"]);
    expect(plan.tasks.filter((task) => task.id === "identity")).toHaveLength(1);
  });

  test("rejects a task assigned to an unselected goal", () => {
    expect(() => preparePlan({
      selectedGoals: [5],
      tasks: [{ id: "checkout", label: "Add checkout", goals: [2] }],
    })).toThrow("Task checkout refers to unselected goal 2");
  });

  test("rejects unsupported goals and an empty execution plan", () => {
    expect(() => preparePlan({ selectedGoals: [11 as never], tasks: [] }))
      .toThrow("Integration goals must be options 1 through 10");
    expect(() => preparePlan({ selectedGoals: [5], tasks: [] }))
      .toThrow("Plan needs at least one task");
  });

  test("rejects missing dependencies and cycles before execution", () => {
    expect(() => preparePlan({
      selectedGoals: [5],
      tasks: [{ id: "meter", label: "Meter", goals: [5], dependsOn: ["identity"] }],
    })).toThrow("Task meter depends on unknown task identity");

    expect(() => preparePlan({
      selectedGoals: [5],
      tasks: [
        { id: "identity", label: "Identity", goals: [5], dependsOn: ["meter"] },
        { id: "meter", label: "Meter", goals: [5], dependsOn: ["identity"] },
      ],
    })).toThrow("Task dependencies contain a cycle");
  });
});

describe("progressFor", () => {
  test("requires evidence for completion and blocks dependents after a required failure", () => {
    const plan = preparePlan({
      selectedGoals: [5],
      tasks: [
        { id: "identity", label: "Identity", goals: [5] },
        { id: "meter", label: "Meter", goals: [5], dependsOn: ["identity"] },
      ],
    });

    expect(() => progressFor(plan, { identity: { status: "completed" } }))
      .toThrow("Completed task identity has no verification evidence");

    const progress = progressFor(plan, {
      identity: { status: "failed", reason: "Customer mapping unresolved" },
    });
    expect(progress.tasks.map((task) => [task.id, task.status]))
      .toEqual([["identity", "failed"], ["meter", "blocked"]]);
    expect(progress.completed).toBe(0);
    expect(progress.total).toBe(2);
    expect(progress.ready).toBe(false);
  });

  test("does not mark dependent work complete before its prerequisite is verified", () => {
    const plan = preparePlan({
      selectedGoals: [5],
      tasks: [
        { id: "identity", label: "Identity", goals: [5] },
        { id: "meter", label: "Meter", goals: [5], dependsOn: ["identity"] },
      ],
    });

    expect(() => progressFor(plan, {
      meter: { status: "completed", evidence: "Local mock event looked correct" },
    })).toThrow("Task meter cannot complete before dependency identity");
  });

  test("does not activate dependent work before its prerequisite is verified", () => {
    const plan = preparePlan({
      selectedGoals: [5],
      tasks: [
        { id: "identity", label: "Identity", goals: [5] },
        { id: "meter", label: "Meter", goals: [5], dependsOn: ["identity"] },
      ],
    });
    expect(() => progressFor(plan, { meter: { status: "active" } }))
      .toThrow("Task meter cannot be active before dependency identity");
  });
});

describe("mergeTasks", () => {
  test("merges a prerequisite shared by two goals into one task", () => {
    const merged = mergeTasks([
      { id: "identity", label: "Map customer identity", goals: [2] },
      { id: "identity", label: "Map customer identity", goals: [5], dependsOn: ["scope"] },
      { id: "scope", label: "Approve scope", goals: [5] },
    ]);
    expect(merged.map((task) => task.id)).toEqual(["identity", "scope"]);
    expect(merged[0]).toMatchObject({ goals: [2, 5], dependsOn: ["scope"] });
  });

  test("rejects the same ID with a different label", () => {
    expect(() => mergeTasks([
      { id: "identity", label: "Map identity", goals: [2] },
      { id: "identity", label: "Something else", goals: [5] },
    ])).toThrow("Task identity has conflicting labels");
  });
});
