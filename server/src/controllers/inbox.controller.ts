import type { Request, Response } from "express";
import { fetchGmailItems } from "../services/gmail.service.js";
import { fetchCalendarItems } from "../services/calendar.service.js";
import { fetchSlackItems } from "../services/slack.service.js";
import { fetchJiraItems } from "../services/jira.service.js";
import { listIntegrations } from "../db/queries/integrations.queries.js";
import {
  getMockGmailItems,
  getMockCalendarItems,
  getMockSlackItems,
  getMockJiraItems,
} from "../services/mock-data.service.js";
import { env } from "../config/env.js";
import type { InboxItem } from "../types/index.js";

/**
 * Aggregates inbox items from all currently connected integrations.
 * In development or for mock users, falls back to rich sample data for connected providers
 * so all features can be tested end-to-end without external credentials.
 */
export async function getInbox(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const userId = user.id;

  const connectedList = await listIntegrations(userId);
  const connectedProviders = new Set(connectedList.map((i) => i.provider));
  const isDevOrMock =
    env.isDev || user.email?.includes("focusflow.local") || user.email?.includes("focusflow.test");

  // Gmail & Calendar: support Google integration or active simulated Gmail stream
  const [gmailItems, calendarItems, slackItems, jiraItems] = await Promise.all([
    (connectedProviders.has("google") || isDevOrMock)
      ? fetchGmailItems(userId).catch((err) => {
          console.warn("[Inbox] Gmail fetch failed:", err.message);
          return isDevOrMock ? getMockGmailItems() : [];
        })
      : Promise.resolve([] as InboxItem[]),

    connectedProviders.has("google")
      ? fetchCalendarItems(userId)
          .then((items) => (items.length > 0 ? items : isDevOrMock ? getMockCalendarItems() : []))
          .catch((err) => {
            console.warn("[Inbox] Calendar fetch failed:", err.message);
            return isDevOrMock ? getMockCalendarItems() : [];
          })
      : Promise.resolve([] as InboxItem[]),

    // Slack
    connectedProviders.has("slack")
      ? fetchSlackItems(userId)
          .then((items) => (items.length > 0 ? items : isDevOrMock ? getMockSlackItems() : []))
          .catch((err) => {
            console.warn("[Inbox] Slack fetch failed:", err.message);
            return isDevOrMock ? getMockSlackItems() : [];
          })
      : Promise.resolve([] as InboxItem[]),

    // Jira
    connectedProviders.has("jira")
      ? fetchJiraItems(userId)
          .then((items) => (items.length > 0 ? items : isDevOrMock ? getMockJiraItems() : []))
          .catch((err) => {
            console.warn("[Inbox] Jira fetch failed:", err.message);
            return isDevOrMock ? getMockJiraItems() : [];
          })
      : Promise.resolve([] as InboxItem[]),
  ]);

  const allItems = [...gmailItems, ...calendarItems, ...slackItems, ...jiraItems];

  // Sort by timestamp, newest first
  allItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  res.json({
    items: allItems,
    sources: {
      gmail: gmailItems.length,
      calendar: calendarItems.length,
      slack: slackItems.length,
      jira: jiraItems.length,
    },
    total: allItems.length,
  });
}

