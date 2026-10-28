import type { Request, Response } from "express";
import { analyzePriorities } from "../services/ai.service.js";
import {
  getCachedAnalysis,
  getLatestCachedAnalysis,
  setCachedAnalysis,
} from "../services/cache.service.js";
import { saveAnalysis, listAnalyses } from "../db/queries/analyses.queries.js";
import {
  createTasksFromAnalysis,
  getDynamicProductivityScore,
} from "../db/queries/tasks.queries.js";
import type { InboxItem } from "../types/index.js";

/**
 * Analyze inbox items with AI provider.
 */
export async function analyzeInbox(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const { items } = req.body as { items: InboxItem[] };

  if (!items || !Array.isArray(items) || items.length === 0) {
    res
      .status(400)
      .json({ error: 'Request body must include a non-empty "items" array' });
    return;
  }

  const cacheInput = items.map((item) => ({
    id: item.id,
    content: item.content,
  }));

  const cached = await getCachedAnalysis(userId, cacheInput);
  if (cached) {
    const result = JSON.parse(cached);
    result.productivityScore = await getDynamicProductivityScore(userId);
    res.json({ result, cached: true });
    return;
  }

  const latestCached = await getLatestCachedAnalysis(userId);

  try {
    const result = await analyzePriorities(items);

    if (result.lowConfidence && latestCached) {
      const latest = JSON.parse(latestCached);
      latest.productivityScore = await getDynamicProductivityScore(userId);
      res.json({ result: latest, cached: true });
      return;
    }

    await setCachedAnalysis(userId, cacheInput, JSON.stringify(result));

    const savedAnalysis = await saveAnalysis(userId, items.length, result);

    if (result.topPriorities.length > 0) {
      const sourceUrlByItemId = new Map(
        items.map((item) => [item.id, item.nativeUrl ?? null]),
      );

      await createTasksFromAnalysis(
        userId,
        savedAnalysis.id,
        result.topPriorities.map((priority) => ({
          originalItemId: priority.originalItemId,
          nativeUrl: sourceUrlByItemId.get(priority.originalItemId) ?? null,
          title: priority.title,
          urgencyScore: priority.urgencyScore,
          importanceScore: priority.importanceScore,
          category: priority.category,
        })),
      );
    }

    result.productivityScore = await getDynamicProductivityScore(userId);
    res.json({ result, cached: false });
  } catch (error) {
    console.error("[Analysis] Provider call failed:", error);

    if (latestCached) {
      const latest = JSON.parse(latestCached);
      latest.productivityScore = await getDynamicProductivityScore(userId);
      res.json({ result: latest, cached: true });
      return;
    }

    res.status(503).json({
      error: "analysis_unavailable",
      lastAnalysis: null,
    });
  }
}

/**
 * Get analysis history for the current user.
 */
export async function getAnalysisHistory(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as any).user.id;
  const limit = parseInt(req.query.limit as string) || 20;

  const analyses = await listAnalyses(userId, limit);

  res.json({
    analyses: analyses.map((analysis) => ({
      id: analysis.id,
      inboxItemCount: analysis.inbox_item_count,
      productivityScore: analysis.productivity_score,
      distribution: analysis.distribution,
      createdAt: analysis.created_at,
    })),
  });
}
