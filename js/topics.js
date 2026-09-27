/**
 * topics.js: Topic List CRUD & selection logic
 *
 * Topic lists are independent top-level entities, not nested under teams.
 * Any topic list can be paired with any team.
 */

import { getData, getActiveTeam, generateId, persistData } from "./state.js";
import { MAX_TOPIC_LISTS, MAX_QUESTION_LISTS } from "./config.js";

export function createTopicList(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const data = getData();
  const lists = Object.values(data.topicLists);

  if (lists.length >= MAX_TOPIC_LISTS) return null;
  if (lists.some(l => l.name.toLowerCase() === trimmed.toLowerCase())) return null;

  const id = generateId();
  data.topicLists[id] = {
    name: trimmed,
    topics: [],
    settings: {
      topicRotation: "new-topic-new-person",
      allowRepeatPeople: false,
      allowRepeatTopics: false
    }
  };

  persistData();
  return id;
}

export function renameTopicList(listId, newName) {
  const trimmed = newName.trim();
  if (!trimmed) return false;

  const data = getData();
  const list = data.topicLists[listId];
  if (!list) return false;

  const others = Object.entries(data.topicLists).filter(([id]) => id !== listId);
  if (others.some(([, l]) => l.name.toLowerCase() === trimmed.toLowerCase())) return false;

  list.name = trimmed;
  persistData();
  return true;
}

export function deleteTopicList(listId) {
  const data = getData();
  const ids = Object.keys(data.topicLists);
  const isSocial = getActiveTeam().settings.mode === "icebreaker";
  if (ids.length <= 1 && isSocial) return false;
  if (!data.topicLists[listId]) return false;

  delete data.topicLists[listId];

  if (data.activeTopicListId === listId) {
    data.activeTopicListId = Object.keys(data.topicLists)[0];
  }

  persistData();
  return true;
}

export function switchTopicList(listId) {
  const data = getData();
  if (!data.topicLists[listId]) return;
  data.activeTopicListId = listId;
  persistData();
}

export function pickRandomTopic(topics, usedTopics) {
  const available = topics.filter(t => !usedTopics.includes(t));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// ─── Question List CRUD (Hot Seat) ─────────────────────────────────

export function createQuestionList(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const data = getData();
  if (!data.questionLists) data.questionLists = {};
  const lists = Object.values(data.questionLists);
  if (lists.length >= MAX_QUESTION_LISTS) return null;
  if (lists.some(l => l.name.toLowerCase() === trimmed.toLowerCase())) return null;
  const id = generateId();
  data.questionLists[id] = {
    name: trimmed,
    questions: [],
    settings: { questionTimerSec: 15, questionsPerPerson: 5, allowSkipQuestion: true }
  };
  persistData();
  return id;
}

export function switchQuestionList(listId) {
  const data = getData();
  if (!data.questionLists || !data.questionLists[listId]) return;
  data.activeQuestionListId = listId;
  persistData();
}

export function deleteQuestionList(listId) {
  const data = getData();
  if (!data.questionLists || !data.questionLists[listId]) return false;
  const ids = Object.keys(data.questionLists);
  if (ids.length <= 1) return false;
  delete data.questionLists[listId];
  if (data.activeQuestionListId === listId) {
    data.activeQuestionListId = Object.keys(data.questionLists)[0];
  }
  persistData();
  return true;
}
