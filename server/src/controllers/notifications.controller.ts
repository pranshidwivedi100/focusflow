import type { Request, Response } from "express";
import { listOpenTasksWithDueAt, listTasks } from "../db/queries/tasks.queries.js";
import { redisClient } from "../config/redis.js";

function buildNotificationsBuckets(
  tasks: Array<{
    id: string;
    title: string;
    due_at: Date | null;
    urgency_score: number | null;
    importance_score: number | null;
  }>,
) {
  const now = new Date();
  const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const fiveHours = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfTomorrow = new Date(endOfToday);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

  const dueIn1Hour: typeof tasks = [];
  const dueIn5Hours: typeof tasks = [];
  const dueToday: typeof tasks = [];
  const dueTomorrow: typeof tasks = [];

  tasks.forEach((task) => {
    if (!task.due_at) return;
    const dueAt = new Date(task.due_at);

    if (dueAt <= oneHour) {
      dueIn1Hour.push(task);
    }
    if (dueAt <= fiveHours) {
      dueIn5Hours.push(task);
    }
    if (dueAt <= endOfToday) {
      dueToday.push(task);
    } else if (dueAt <= endOfTomorrow) {
      dueTomorrow.push(task);
    }
  });

  return [
    {
      bucket: "due_in_1_hour",
      count: dueIn1Hour.length,
      tasks: dueIn1Hour,
    },
    {
      bucket: "due_in_5_hours",
      count: dueIn5Hours.length,
      tasks: dueIn5Hours,
    },
    {
      bucket: "due_today",
      count: dueToday.length,
      tasks: dueToday,
    },
    {
      bucket: "due_tomorrow",
      count: dueTomorrow.length,
      tasks: dueTomorrow,
    },
  ];
}

/**
 * Returns active notifications, unread count, urgent/P0 items, and bucket summaries.
 */
export async function getNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as any).user.id as string;

  // Retrieve pending open tasks
  const pendingTasks = await listTasks(userId, "pending", 50);

  // Retrieve set of read notification IDs from Redis
  let readSet = new Set<string>();
  try {
    const rawRead = await redisClient.sMembers(`focusflow:notifications:read:${userId}`);
    readSet = new Set(rawRead || []);
  } catch (err) {
    console.warn("[Notifications] Redis read set error:", err);
  }

  const items = pendingTasks.map((t) => {
    const urgency = Number(t.urgency_score ?? 0);
    const importance = Number(t.importance_score ?? 0);
    const isUrgent = urgency >= 0.70;
    const isP0 = urgency >= 0.85;
    const isRead = readSet.has(t.id);

    return {
      id: t.id,
      title: t.title,
      category: t.category || (isUrgent ? "Blocker" : "Email Action"),
      urgencyScore: urgency,
      importanceScore: importance,
      isUrgent,
      isP0,
      dueAt: t.due_at,
      createdAt: t.created_at,
      nativeUrl: t.native_url,
      read: isRead,
    };
  });

  // Calculate live badge count: pending urgent items that haven't been marked read
  const unreadUrgentCount = items.filter((i) => i.isUrgent && !i.read).length;
  const unreadTotalCount = items.filter((i) => !i.read).length;
  const p0Count = items.filter((i) => i.isP0 && !i.read).length;

  const deadlineTasks = await listOpenTasksWithDueAt(userId);
  const buckets = buildNotificationsBuckets(
    deadlineTasks.map((task) => ({
      id: task.id,
      title: task.title,
      due_at: task.due_at,
      urgency_score: task.urgency_score,
      importance_score: task.importance_score,
    })),
  );

  res.json({
    unreadCount: unreadUrgentCount,
    unreadTotalCount,
    p0Count,
    items,
    notifications: buckets,
  });
}

/**
 * Marks individual notification or all active notifications as read.
 */
export async function markNotificationsRead(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as any).user.id as string;
  const { id, all } = req.body as { id?: string; all?: boolean };

  try {
    const redisKey = `focusflow:notifications:read:${userId}`;
    if (all) {
      const pendingTasks = await listTasks(userId, "pending", 50);
      const ids = pendingTasks.map((t) => t.id);
      if (ids.length > 0) {
        await redisClient.sAdd(redisKey, ids);
        await redisClient.expire(redisKey, 86400 * 7); // 7 days
      }
    } else if (id) {
      await redisClient.sAdd(redisKey, id);
      await redisClient.expire(redisKey, 86400 * 7);
    }

    res.json({ success: true, message: "Notifications marked as read" });
  } catch (err: any) {
    console.error("[Notifications] Mark read error:", err);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
}
