/**
 * teams.js: Team CRUD operations
 *
 * Teams are top-level entities stored in data.teams.
 * Each team has: name, participants[], settings.
 */

import { getData, getActiveTeam, generateId, persistData, session, transient } from "./state.js";
import { MAX_TEAMS, TIMER_DEFAULT, MODE_DEFAULTS } from "./config.js";
import { renderAll } from "./render.js";
import * as Timer from "./timer.js";
import { appConfirm } from "./promptDialog.js";

export function createTeam(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const data = getData();
  const teams = Object.values(data.teams);

  if (teams.length >= MAX_TEAMS) return null;
  if (teams.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) return null;

  const id = generateId();
  data.teams[id] = {
    name: trimmed,
    participants: [],
    settings: {
      mode: "standup",
      timerDurationSec: TIMER_DEFAULT,
      autoAdvance: MODE_DEFAULTS.standup.autoAdvance,
      randomOrder: MODE_DEFAULTS.standup.randomOrder,
      raffle: { prizeCount: MODE_DEFAULTS.raffle.prizeCount }
    }
  };

  persistData();
  return id;
}

export function renameTeam(teamId, newName) {
  const trimmed = newName.trim();
  if (!trimmed) return false;

  const data = getData();
  const team = data.teams[teamId];
  if (!team) return false;

  const others = Object.entries(data.teams).filter(([id]) => id !== teamId);
  if (others.some(([, t]) => t.name.toLowerCase() === trimmed.toLowerCase())) return false;

  team.name = trimmed;
  persistData();
  return true;
}

export function deleteTeam(teamId) {
  const data = getData();
  const ids = Object.keys(data.teams);
  if (ids.length <= 1) return false;
  if (!data.teams[teamId]) return false;

  delete data.teams[teamId];

  if (data.activeTeamId === teamId) {
    data.activeTeamId = Object.keys(data.teams)[0];
    session.reset();
    Timer.stop();
    transient.isPicking = false;
    transient.currentWinner = null;
    transient.timerRemaining = getActiveTeam().settings.timerDurationSec;
    renderAll();
  }

  persistData();
  return true;
}

export async function switchTeam(teamId) {
  const data = getData();
  if (!data.teams[teamId]) return;
  if (data.activeTeamId === teamId) return;

  // Confirm if active session in progress
  if (session.selectionHistory.length > 0) {
    const targetName = data.teams[teamId] ? data.teams[teamId].name : "another team";
    const ok = await appConfirm(
      "Active Session in Progress",
      session.selectionHistory.length + " people have already been picked. Switching to ‘" + targetName + "’ will end this session.",
      { confirmLabel: "Switch & Reset", danger: true }
    );
    if (!ok) return;
  }

  Timer.stop();
  transient.isPicking = false;
  transient.currentWinner = null;
  session.reset();

  data.activeTeamId = teamId;
  transient.timerRemaining = getActiveTeam().settings.timerDurationSec;
  persistData();
  renderAll();
}

/** Keep names unique: "Team", "Team (2)", ... */
export function uniqueTeamName(base) {
  const taken = new Set(Object.values(getData().teams).map(t => t.name.toLowerCase()));
  let name = base;
  for (let i = 2; taken.has(name.toLowerCase()); i++) name = base.slice(0, 34) + " (" + i + ")";
  return name;
}

/** Add a team received via share link (see teamLink.js), then switch to it. */
export async function addSharedTeam(shared) {
  const ok = await appConfirm(
    "Add ‘" + shared.name + "’?",
    "Someone shared a team with " + shared.participants.length + " people. It will be added to your teams on this device.",
    { confirmLabel: "Add Team" }
  );
  if (!ok) return false;

  const id = createTeam(uniqueTeamName(shared.name));
  if (!id) return false;
  getData().teams[id].participants = shared.participants;
  persistData();
  await switchTeam(id);
  return true;
}
