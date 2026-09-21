/**
 * Intake progress for Simone (Story Starter Kit) and Olivia (Story Bible) agent chats.
 * Parses "Question N" labels from agent message history — no backend metadata required.
 */

export const OLIVIA_INTAKE_MILESTONES = [
  "1",
  "2",
  "3",
  "4",
  "4b",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "13b",
  "14",
  "14b",
  "15",
];

const INTAKE_CONFIG = {
  simone: {
    total: 20,
    label: "Story Starter Kit",
    questionRe: /Question\s+(\d+)\s*:/gi,
    getStepKey: (match) => String(parseInt(match[1], 10)),
    getCurrentFromStep: (stepKey) => parseInt(stepKey, 10),
    getPercent: (current, total) => Math.min(100, (current / total) * 100),
  },
  olivia: {
    total: 15,
    label: "Story Bible intake",
    questionRe: /Question\s+(\d+[a-z]?)\s*[–—-]/gi,
    getStepKey: (match) => match[1].toLowerCase(),
    getCurrentFromStep: (stepKey) => {
      const num = parseInt(stepKey, 10);
      return Number.isFinite(num) ? num : 0;
    },
    getPercent: (_current, _total, milestoneIndex) => {
      if (milestoneIndex < 0) return 0;
      return Math.min(
        100,
        ((milestoneIndex + 1) / OLIVIA_INTAKE_MILESTONES.length) * 100
      );
    },
  },
};

function extractMessageText(msg) {
  if (!msg) return "";
  if (typeof msg.text === "string") return msg.text;
  if (typeof msg.content === "string") return msg.content;
  return "";
}

function findHighestSimoneStep(text, config) {
  let highest = 0;
  for (const match of text.matchAll(config.questionRe)) {
    const n = parseInt(match[1], 10);
    if (Number.isFinite(n) && n > highest) highest = n;
  }
  return highest > 0 ? String(highest) : null;
}

function findHighestOliviaStep(text) {
  let highestIdx = -1;
  for (const match of text.matchAll(INTAKE_CONFIG.olivia.questionRe)) {
    const key = match[1].toLowerCase();
    const idx = OLIVIA_INTAKE_MILESTONES.indexOf(key);
    if (idx > highestIdx) highestIdx = idx;
  }
  return highestIdx >= 0 ? OLIVIA_INTAKE_MILESTONES[highestIdx] : null;
}

function findHighestStep(agentId, agentMessages) {
  const config = INTAKE_CONFIG[agentId];
  if (!config) return { stepKey: null, milestoneIndex: -1 };

  let bestStepKey = null;
  let bestMilestoneIndex = -1;

  for (const msg of agentMessages) {
    const text = extractMessageText(msg);
    if (!text) continue;

    if (agentId === "simone") {
      const stepKey = findHighestSimoneStep(text, config);
      if (stepKey) {
        const n = parseInt(stepKey, 10);
        const prev = bestStepKey ? parseInt(bestStepKey, 10) : 0;
        if (n > prev) bestStepKey = stepKey;
      }
    } else if (agentId === "olivia") {
      const stepKey = findHighestOliviaStep(text);
      if (stepKey) {
        const idx = OLIVIA_INTAKE_MILESTONES.indexOf(stepKey);
        if (idx > bestMilestoneIndex) {
          bestMilestoneIndex = idx;
          bestStepKey = stepKey;
        }
      }
    }
  }

  return { stepKey: bestStepKey, milestoneIndex: bestMilestoneIndex };
}

/**
 * @param {"simone"|"olivia"|string} agentId
 * @param {Array<{ text?: string, content?: string }>} agentMessages
 * @returns {null | { current: number, total: number, remaining: number, percent: number, label: string, stepKey: string }}
 */
export function getAgentIntakeProgress(agentId, agentMessages) {
  const key = String(agentId || "").toLowerCase();
  const config = INTAKE_CONFIG[key];
  if (!config || !Array.isArray(agentMessages) || agentMessages.length === 0) {
    return null;
  }

  const { stepKey, milestoneIndex } = findHighestStep(key, agentMessages);
  if (!stepKey) return null;

  const current = config.getCurrentFromStep(stepKey);
  if (!current || current < 1) return null;

  const total = config.total;
  const remaining = Math.max(0, total - current);
  const percent =
    key === "olivia"
      ? config.getPercent(current, total, milestoneIndex)
      : config.getPercent(current, total);

  return {
    current,
    total,
    remaining,
    percent,
    label: config.label,
    stepKey,
  };
}
