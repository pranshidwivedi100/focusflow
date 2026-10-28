import type { Request, Response } from "express";
import {
  updateTaskStatus,
  updateTaskStatusByOriginalItemId,
  listTasks,
} from "../db/queries/tasks.queries.js";
import { redisClient } from "../config/redis.js";

/**
 * Update a task's status (complete or dismiss).
 */
export async function patchTask(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !["completed", "dismissed"].includes(status)) {
    res
      .status(400)
      .json({ error: 'Status must be "completed" or "dismissed"' });
    return;
  }

  const task = await updateTaskStatus(id, userId, status);

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  // Immediately track in read notifications set
  redisClient.sAdd(`focusflow:notifications:read:${userId}`, id).catch(() => {});

  res.json({ task });
}

/**
 * Update task status using the original inbox item ID.
 */
export async function patchTaskByOriginalItemId(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as any).user.id;
  const { originalItemId } = req.params;
  const { status } = req.body;

  if (!status || !["completed", "dismissed"].includes(status)) {
    res
      .status(400)
      .json({ error: 'Status must be "completed" or "dismissed"' });
    return;
  }

  const task = await updateTaskStatusByOriginalItemId(
    originalItemId,
    userId,
    status,
  );

  if (!task) {
    res.status(404).json({ error: "Task not found for this inbox item" });
    return;
  }

  res.json({ task });
}

/**
 * List tasks for the current user, optionally filtered by status.
 */
export async function getTasks(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const status = req.query.status as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;

  const tasks = await listTasks(userId, status, limit);
  res.json({ tasks });
}
