import { SourceType, type InboxItem, type AnalysisResult, type PrioritizedTask, type CategoryType, type TaskCategory } from "../types/index.js";
import { AnalysisResultSchema } from "../validators/gemini.schema.js";

/**
 * Returns realistic mock Gmail items for Dev / Demo mode.
 */
export function getMockGmailItems(): InboxItem[] {
  const now = Date.now();
  return [
    {
      id: "mock-gmail-urgent-payment",
      source: SourceType.EMAIL,
      sender: "sarah.connor@acmecorp.com",
      subject: "[URGENT] Payment processing failure for Acme Corp Enterprise subscription",
      content:
        "Hi FocusFlow team, our billing portal threw repeated 500 errors during checkout for our 200-seat renewal. Needs immediate engineer intervention before contract expiry at 5 PM today.",
      timestamp: new Date(now - 20 * 60 * 1000).toISOString(), // 20m ago
      read: false,
      nativeUrl: "https://mail.google.com/mail/u/0/#inbox/mock-gmail-urgent-payment",
    },
    {
      id: "mock-gmail-aws-alert",
      source: SourceType.EMAIL,
      sender: "no-reply-alerts@aws.amazon.com",
      subject: "AWS CloudWatch Alert: Production Aurora PostgreSQL connection pool > 88%",
      content:
        "Alarm 'DB-HighConnections' triggered: active client connections reached 89% of configured maximum pool limit on primary cluster ep-weathered-mouse. Investigate open connection leaks.",
      timestamp: new Date(now - 45 * 60 * 1000).toISOString(), // 45m ago
      read: false,
      nativeUrl: "https://console.aws.amazon.com/cloudwatch",
    },
    {
      id: "mock-gmail-digest",
      source: SourceType.EMAIL,
      sender: "editor@distributed-systems.digest",
      subject: "Weekly Engineering Digest #142: Zero-Copy Serialization & Vector Search",
      content:
        "Here are the top trending open-source architectures, deep-dive benchmarks, and distributed database papers of the week.",
      timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(), // 6h ago
      read: true,
      nativeUrl: "https://mail.google.com/mail/u/0/#inbox/mock-gmail-digest",
    },
  ];
}

/**
 * Returns realistic mock Calendar items for Dev / Demo mode.
 */
export function getMockCalendarItems(): InboxItem[] {
  const now = Date.now();
  return [
    {
      id: "mock-cal-freeze",
      source: SourceType.CALENDAR,
      sender: "alex.lead@focusflow.local",
      subject: "Sprint 24 Code Freeze & Production Release Cut",
      content:
        "All PRs targeting production release v1.2 must have passing CI checks and two peer approvals before 3:00 PM today.",
      timestamp: new Date(now + 90 * 60 * 1000).toISOString(), // in 1.5h
      read: false,
      nativeUrl: "https://calendar.google.com/calendar/event?eid=mock-cal-freeze",
    },
    {
      id: "mock-cal-arch-review",
      source: SourceType.CALENDAR,
      sender: "elena.security@focusflow.local",
      subject: "FocusFlow Q4 Architecture & Security Review",
      content:
        "Review token encryption (AES-256-GCM), Redis session invalidation on logout, and API rate-limiting safeguards with Security Lead.",
      timestamp: new Date(now + 4 * 60 * 60 * 1000).toISOString(), // in 4h
      read: false,
      nativeUrl: "https://calendar.google.com/calendar/event?eid=mock-cal-arch-review",
    },
    {
      id: "mock-cal-standup",
      source: SourceType.CALENDAR,
      sender: "team@focusflow.local",
      subject: "Daily Engineering Standup & Blocker Sync",
      content:
        "15-minute quick standup: discuss blockers, daily priorities, and enterprise customer deployment status.",
      timestamp: new Date(now + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
      read: false,
      nativeUrl: "https://calendar.google.com/calendar/event?eid=mock-cal-standup",
    },
  ];
}

/**
 * Returns realistic mock Slack items for Dev / Demo mode.
 */
export function getMockSlackItems(): InboxItem[] {
  const now = Date.now();
  return [
    {
      id: "mock-slack-manager-mention",
      source: SourceType.SLACK,
      sender: "@marcus.vp.eng",
      subject: "#incidents-prod",
      content:
        "@dev Can you urgently jump on the incident bridge? Multiple enterprise clients reporting OAuth callback timeout issues.",
      timestamp: new Date(now - 12 * 60 * 1000).toISOString(), // 12m ago
      read: false,
      nativeUrl: "https://slack.com/archives/C012345/p123456789",
    },
    {
      id: "mock-slack-datadog-alert",
      source: SourceType.SLACK,
      sender: "Datadog-Bot",
      subject: "#alerts-infra",
      content:
        "[CRITICAL ALERT] Latency spike detected on /api/analyze: p99 exceeded 2,400ms for consecutive 5-minute sampling window.",
      timestamp: new Date(now - 30 * 60 * 1000).toISOString(), // 30m ago
      read: false,
      nativeUrl: "https://slack.com/archives/C054321/p987654321",
    },
    {
      id: "mock-slack-thread-reply",
      source: SourceType.SLACK,
      sender: "@priya.ux",
      subject: "#product-design",
      content:
        "Shared the updated Figma component library for kinetic priority hub and high-contrast dark mode badges. Please review when free.",
      timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
      read: false,
      nativeUrl: "https://slack.com/archives/C011223/p112233445",
    },
  ];
}

/**
 * Returns realistic mock Jira items for Dev / Demo mode.
 */
export function getMockJiraItems(): InboxItem[] {
  const now = Date.now();
  return [
    {
      id: "mock-jira-p0-blocker",
      source: SourceType.JIRA,
      sender: "Michael Chang (QA Lead)",
      subject: "FF-104",
      content:
        "[P0 Blocker] OAuth state token validation intermittent failure on mobile Safari browsers",
      timestamp: new Date(now - 50 * 60 * 1000).toISOString(), // 50m ago
      read: false,
      nativeUrl: "https://focusflow-dev.atlassian.net/browse/FF-104",
    },
    {
      id: "mock-jira-sprint-task",
      source: SourceType.JIRA,
      sender: "Alex Rivers (Tech Lead)",
      subject: "FF-92",
      content:
        "Implement AES-256-GCM token encryption at rest for all third-party integration credentials",
      timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
      read: false,
      nativeUrl: "https://focusflow-dev.atlassian.net/browse/FF-92",
    },
    {
      id: "mock-jira-backlog-task",
      source: SourceType.JIRA,
      sender: "Jordan Smith (Product Manager)",
      subject: "FF-118",
      content:
        "Evaluate Server-Sent Events vs WebSockets for realtime inbox prioritization streaming",
      timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      read: false,
      nativeUrl: "https://focusflow-dev.atlassian.net/browse/FF-118",
    },
  ];
}

/**
 * Intelligent rule-based fallback AI prioritization engine.
 * Guarantees a 100% schema-valid AnalysisResult without requiring external AI APIs.
 */
export function generateFallbackAnalysis(items: InboxItem[]): AnalysisResult {
  if (items.length === 0) {
    return {
      topPriorities: [],
      productivityScore: 100,
      distribution: { urgent: 0, important: 0, routine: 0, noise: 0 },
      itemClassifications: [],
      lowConfidence: false,
    };
  }

  type ScoredItem = {
    item: InboxItem;
    urgencyScore: number;
    importanceScore: number;
    category: CategoryType;
    taskCategory: TaskCategory;
    reason: string;
    action: string;
  };

  const urgentRegex =
    /urgent|p0|blocker|outage|spiked|incident|fail|critical|alert|freeze|asap|down/i;
  const importantRegex =
    /review|roadmap|security|sprint|approval|pr|threshold|deploy|payment|invoice|wire/i;
  const noiseRegex =
    /digest|newsletter|unsubscribe|promo|marketing|weekly digest/i;

  const scoredItems: ScoredItem[] = items.map((item) => {
    const text = `${item.subject} ${item.content} ${item.sender}`;

    // Determine specific category tag: "Email Action", "Meeting", "Blocker", or "Bug"
    let taskCategory: TaskCategory = "Email Action";
    if (
      item.source === SourceType.CALENDAR ||
      /meeting|standup|sync|call|review|board/i.test(item.subject)
    ) {
      taskCategory = "Meeting";
    } else if (
      /bug|leak|regression|exception|crash|error 500|500 error/i.test(text)
    ) {
      taskCategory = "Bug";
    } else if (
      /blocker|p0|server down|outage|incident|fail|emergency/i.test(text)
    ) {
      taskCategory = "Blocker";
    } else if (
      item.source === SourceType.EMAIL ||
      /email|payment|invoice|wire|client|reply/i.test(text)
    ) {
      taskCategory = "Email Action";
    }

    if (urgentRegex.test(text)) {
      return {
        item,
        urgencyScore: 0.95,
        importanceScore: 0.92,
        category: "Urgent",
        taskCategory,
        reason:
          "High-impact client or infrastructure blocker requiring immediate same-day triage.",
        action:
          "Investigate root cause immediately and unblock impacted stakeholders.",
      };
    }

    if (importantRegex.test(text)) {
      return {
        item,
        urgencyScore: 0.78,
        importanceScore: 0.86,
        category: "Important",
        taskCategory,
        reason:
          "Key strategic deliverable or scheduled meeting with direct client/sprint impact.",
        action:
          "Review documentation and prepare deliverables prior to the deadline.",
      };
    }

    if (noiseRegex.test(text)) {
      return {
        item,
        urgencyScore: 0.15,
        importanceScore: 0.25,
        category: "Noise",
        taskCategory: "Admin",
        reason: "Low-impact informational newsletter or general digest.",
        action: "File or archive for later review during downtime.",
      };
    }

    // Routine communications
    return {
      item,
      urgencyScore: 0.42,
      importanceScore: 0.55,
      category: "Routine",
      taskCategory,
      reason: "Standard team coordination or ongoing backlog discussion.",
      action: "Acknowledge message and schedule for upcoming sprint cycle.",
    };
  });

  // Sort by composite score (urgency 60% + importance 40%)
  scoredItems.sort((a, b) => {
    const scoreA = a.urgencyScore * 0.6 + a.importanceScore * 0.4;
    const scoreB = b.urgencyScore * 0.6 + b.importanceScore * 0.4;
    return scoreB - scoreA;
  });

  // Pick top 3-5 items as top priorities
  const topCount = Math.min(Math.max(scoredItems.length > 2 ? 3 : scoredItems.length, 1), 5);
  const topPriorities: PrioritizedTask[] = scoredItems.slice(0, topCount).map((scored, idx) => ({
    id: `p-${idx + 1}-${scored.item.id}`,
    originalItemId: scored.item.id,
    title: scored.item.subject.replace(/^\[.*?\]\s*/, "").slice(0, 80) || scored.item.content.slice(0, 80),
    summary: scored.item.content.slice(0, 160),
    urgencyScore: scored.urgencyScore,
    importanceScore: scored.importanceScore,
    reason: scored.reason,
    suggestedAction: scored.action,
    category: scored.taskCategory,
  }));

  // Calculate distribution
  const distribution = {
    urgent: scoredItems.filter((i) => i.category === "Urgent").length,
    important: scoredItems.filter((i) => i.category === "Important").length,
    routine: scoredItems.filter((i) => i.category === "Routine").length,
    noise: scoredItems.filter((i) => i.category === "Noise").length,
  };

  const itemClassifications = scoredItems.map((s) => ({
    itemId: s.item.id,
    category: s.category,
  }));

  const rawResult: AnalysisResult = {
    topPriorities,
    productivityScore: Math.round(75 + Math.random() * 15),
    distribution,
    itemClassifications,
    lowConfidence: false,
  };

  return AnalysisResultSchema.parse(rawResult);
}
