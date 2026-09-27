/**
 * pickIcebreaker.js: Icebreaker mode topic picking with cloud animation
 */

import { gsap } from "gsap";
import { getActiveTopicList, session, transient } from "./state.js";
import { waitGsap, waitTimeline } from "./config.js";
import { pickRandomTopic } from "./topics.js";
import { renderCloud, renderTopicCloud } from "./render.js";
import { runWakeUp, runSuspenseAnimation } from "./pickAnimations.js";
import { rpShuffled } from "./pickerUtils.js";

export async function pickIcebreakerTopic() {
  const topicList = getActiveTopicList();
  if (!topicList) return;

  const ts = topicList.settings;
  const gen = transient.sessionGen;

  if (ts.topicRotation === "same-topic-new-person") {
    if (!session.sessionTopic) {
      const topic = await runTopicCloudPick(topicList.topics, []);
      if (gen !== transient.sessionGen) return;
      if (topic) session.sessionTopic = topic;
    }
  } else {
    const usedTopics = ts.allowRepeatTopics ? [] : session.usedTopics;
    const topic = await runTopicCloudPick(topicList.topics, usedTopics);
    if (gen !== transient.sessionGen) return;
    if (topic) {
      session.sessionTopic = topic;
      session.usedTopics.push(topic);
    }
  }
}

// A uniform sample of candidates keeps the cloud readable; picking uniformly
// from a uniform sample is still uniform over every available topic.
export const TOPIC_CLOUD_SAMPLE = 12;

export async function runTopicCloudPick(allTopics, usedTopics) {
  const available = allTopics.filter(t => !usedTopics.includes(t));
  if (available.length === 0) return null;

  const candidates = rpShuffled(available).slice(0, TOPIC_CLOUD_SAMPLE);
  const topicMeta = renderTopicCloud(candidates, []);
  if (topicMeta.length === 0) return pickRandomTopic(allTopics, usedTopics);

  const savedLayoutMeta = transient.layoutMeta;
  transient.layoutMeta = topicMeta;
  const gen = transient.sessionGen;

  const eligibleMeta = topicMeta.filter(m => !usedTopics.includes(m.name));
  let winnerTopic;
  let winnerMeta;

  if (eligibleMeta.length > 1) {
    await runWakeUp();
    if (gen !== transient.sessionGen) return null;
    const result = await runSuspenseAnimation(3, new Set(usedTopics));
    if (gen !== transient.sessionGen) return null;
    if (!result) { // cancelled
      transient.layoutMeta = savedLayoutMeta;
      renderCloud();
      return null;
    }
    winnerTopic = result.name;
    winnerMeta = topicMeta.find(m => m.name === winnerTopic);
  } else {
    winnerTopic = eligibleMeta.length === 1 ? eligibleMeta[0].name : available[0];
    winnerMeta = topicMeta.find(m => m.name === winnerTopic);
  }

  if (!winnerMeta) {
    transient.layoutMeta = savedLayoutMeta;
    renderCloud();
    return winnerTopic;
  }

  winnerMeta.el.className = "name-tag topic-tag active-winner";
  const revealTl = gsap.timeline();
  revealTl
    .fromTo(winnerMeta.el,
      { scale: 0.9, opacity: 0.6 },
      { scale: 1.35, opacity: 1, duration: 0.4, ease: "back.out(2.5)" })
    .to(winnerMeta.el, { scale: 1.1, duration: 0.3, ease: "power2.out" });
  gsap.fromTo(winnerMeta.el, { rotation: -10 }, { rotation: 0, duration: 1, ease: "elastic.out(1.2, 0.3)" });
  await waitTimeline(revealTl);
  if (gen !== transient.sessionGen) return null;

  await waitGsap(1.5);
  if (gen !== transient.sessionGen) return null;

  transient.layoutMeta = savedLayoutMeta;
  renderCloud();

  return gen === transient.sessionGen ? winnerTopic : null;
}
