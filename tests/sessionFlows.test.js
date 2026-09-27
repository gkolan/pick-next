// @vitest-environment jsdom
/* global document */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Exercise real state, rendering, timers and session orchestration. Only visual
// animation/layout/audio are replaced, so races are deterministic and fast.
vi.mock('gsap', () => ({ gsap: { set: vi.fn(), to: vi.fn(), killTweensOf: vi.fn() } }));
vi.mock('../js/confetti.js', () => ({ celebrate: vi.fn(), confetti: vi.fn() }));
vi.mock('../js/theatre.js', () => ({ startTheatre: vi.fn(), stopTheatre: vi.fn(), theatreCheckUrgency: vi.fn() }));
vi.mock('../js/sound.js', () => ({ sfx: { buzz: vi.fn() }, initSoundToggle: vi.fn() }));
vi.mock('../js/renderCloud.js', () => ({
  renderCloud: vi.fn(), renderTopicCloud: vi.fn(() => []),
  positionBarAboveCloud: vi.fn(), decorateRaffleWinner: vi.fn()
}));
vi.mock('../js/config.js', async importOriginal => ({
  ...await importOriginal(), waitGsap: vi.fn(async () => {}), waitTimeline: vi.fn(async () => {})
}));
vi.mock('../js/pickAnimations.js', () => ({
  resetTagClasses: vi.fn(), runSweepToTarget: vi.fn(async () => {}),
  runWakeUp: vi.fn(async () => {}), runSuspenseAnimation: vi.fn(), runReveal: vi.fn()
}));

import { initState, getActiveTeam, getActiveQuestionList, session, transient } from '../js/state.js';
import { DOM, cacheDom } from '../js/domCache.js';
import { updateUI, lockSettings } from '../js/render.js';
import { beginPickCycle, createSidebarReveal } from '../js/pick.js';
import { endSession, showRecapEarly, cancelPick } from '../js/session.js';
import { waitGsap } from '../js/config.js';
import { runReveal, runSuspenseAnimation, runWakeUp } from '../js/pickAnimations.js';
import { renderCloud, renderTopicCloud } from '../js/renderCloud.js';
import { pickIcebreakerTopic } from '../js/pickIcebreaker.js';
import { questionResolve, handleHotSeatNextQuestion } from '../js/questionFlow.js';
import { initEditorExtras } from '../js/editor.js';
import { bindSettingsEvents } from '../js/mainEvents.js';
import * as Timer from '../js/timer.js';
import '../js/main.js'; // install the production timer expiry and speaker-time hooks

const markup = readFileSync(resolve('index.html'), 'utf8');
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  document.body.innerHTML = markup.slice(markup.indexOf('<body>') + 6, markup.indexOf('</body>'));
  cacheDom();
  localStorage.clear();
  initState();
  endSession();
  const team = getActiveTeam();
  team.participants = [{ name: 'Alice', chances: 1 }, { name: 'Bob', chances: 1 }];
  team.settings.timerDurationSec = 5;
  waitGsap.mockImplementation(async () => {});
  runSuspenseAnimation.mockResolvedValue({ name: 'Alice', chances: 1 });
  runReveal.mockImplementation(async (_winner, _meta, reveal) => {
    transient.isPicking = false;
    reveal();
  });
});

afterEach(() => { endSession(); vi.useRealTimers(); });

describe('session regressions', () => {
  it('keeps the last speaker active through the reveal pause and the full timer', async () => {
    getActiveTeam().participants.length = 1;
    await beginPickCycle('manual');
    expect(DOM.recapPanel.style.display).toBe('none');
    expect(transient.currentWinner).toBe('Alice');
    await vi.advanceTimersByTimeAsync(2450);
    expect(transient.isTimerRunning).toBe(true);
    expect(DOM.recapPanel.style.display).toBe('none');
    await vi.advanceTimersByTimeAsync(6000);
    expect(DOM.recapPanel.style.display).toBe('');
    expect(session.selectionHistory[0].timerUsed).toBe(6);
  });

  it('does not restart a pending speaker timer after the session ends', async () => {
    createSidebarReveal(getActiveTeam().settings, getActiveTeam().participants[0], transient.sessionGen)();
    endSession();
    expect(transient.pendingTurn).toBeNull();
    await vi.advanceTimersByTimeAsync(3000);
    expect(transient.isTimerRunning).toBe(false);
    expect(session.selectionHistory).toEqual([]);
  });

  it.each(['standup', 'raffle', 'hotseat'])('cannot revive a cancelled %s pick or release a newer pick lock', async mode => {
    getActiveTeam().settings.mode = mode;
    let finishDelay;
    waitGsap.mockImplementationOnce(() => new Promise(resolve => { finishDelay = resolve; }));
    const oldPick = beginPickCycle('manual');
    cancelPick();
    expect(transient.pickInFlight).toBeNull();
    const newLock = {};
    transient.pickInFlight = newLock;
    finishDelay();
    await oldPick;
    expect(runReveal).not.toHaveBeenCalled();
    expect(session.selectionHistory).toEqual([]);
    expect(transient.pickInFlight).toBe(newLock);
  });

  it('does not restore an old topic cloud after cancellation and a new session', async () => {
    getActiveTeam().settings.mode = 'icebreaker';
    renderTopicCloud.mockReturnValueOnce([{ name: 'Topic A' }, { name: 'Topic B' }]);
    let finishWake;
    runWakeUp.mockImplementationOnce(() => new Promise(resolve => { finishWake = resolve; }));
    const oldTopic = pickIcebreakerTopic();
    endSession();
    const newerLayout = [{ name: 'New session' }];
    transient.layoutMeta = newerLayout;
    renderCloud.mockClear();
    finishWake();
    await oldTopic;
    expect(transient.layoutMeta).toBe(newerLayout);
    expect(renderCloud).not.toHaveBeenCalled();
    expect(session.sessionTopic).toBeNull();
    transient.layoutMeta = [];
  });

  it('advances Hot Seat on timeout even when Standup auto-advance is off', async () => {
    getActiveTeam().settings.mode = 'hotseat';
    getActiveTeam().settings.autoAdvance = false;
    Object.assign(getActiveQuestionList().settings, { questionsPerPerson: 2, questionTimerSec: 5 });
    const round = beginPickCycle('manual');
    await flush();
    expect(DOM.hotseatCardCounter.textContent).toBe('Q1 of 2');
    await vi.advanceTimersByTimeAsync(6000);
    expect(DOM.hotseatCardCounter.textContent).toBe('Q2 of 2');
    expect(transient.isTimerRunning).toBe(true);
    handleHotSeatNextQuestion(false);
    await round;
    expect(session.selectionHistory[0]).toMatchObject({ questionsAnswered: 1, questionsSkipped: 1 });
  });

  it.each(['close', 'recap'])('settles an interrupted Hot Seat question on %s without affecting a new timer', async action => {
    getActiveTeam().settings.mode = 'hotseat';
    const round = beginPickCycle('manual');
    await flush();
    expect(questionResolve).toBeTypeOf('function');
    if (action === 'close') endSession(); else showRecapEarly();
    expect(questionResolve).toBeNull();
    getActiveTeam().settings.mode = 'standup';
    Timer.start(5);
    DOM.hotseatCard.style.display = ''; // a newer session may already own the card
    await round;
    expect(transient.isTimerRunning).toBe(true);
    expect(DOM.hotseatCard.style.display).toBe('');
    expect(session.hotSeatAnswers).toEqual([]);
    expect(session.selectionHistory).toEqual([]);
  });

  it('locks every mode setting and mobile editor and blocks keyboard mode changes', () => {
    bindSettingsEvents();
    lockSettings(false);
    for (const el of [DOM.icebreakerTopicListSelect, DOM.hotseatQuestionListSelect,
      DOM.hotseatQuestionsPerPerson, DOM.hotseatTimerInput, DOM.mobileEditBtn,
      DOM.mobileNewBtn, DOM.importBtn, ...DOM.modeBtns]) {
      expect(el.disabled).toBe(true);
    }
    DOM.modeBtns[1].click();
    expect(getActiveTeam().settings.mode).toBe('standup');
    lockSettings(true);
    DOM.modeBtns[1].click();
    expect(getActiveTeam().settings.mode).toBe('raffle');
    expect(DOM.hotseatTimerInput.disabled).toBe(false);
  });

  it('adds 99 pasted names to one existing participant, up to the 100-person cap', () => {
    DOM.editorRows.innerHTML = '<div class="editor-row"><input class="editor-name-input" value="Alice"></div>';
    initEditorExtras();
    DOM.editorPasteInput.value = ['alice', ...Array.from({ length: 110 }, (_, i) => `Person ${i}`)].join('\n');
    DOM.editorPasteAdd.click();
    expect(DOM.editorRows.querySelectorAll('.editor-name-input')).toHaveLength(100);
    expect(document.getElementById('toast').textContent).toBe('99 names added');
  });

  it('does not show an early recap when the final turn has a pending timer', () => {
    getActiveTeam().participants.length = 1;
    session.selectionHistory.push({ name: 'Alice', mode: 'standup' });
    transient.currentWinner = 'Alice';
    transient.pendingTurn = {};
    updateUI();
    expect(DOM.recapPanel.style.display).toBe('none');
    expect(transient.currentWinner).toBe('Alice');
  });
});
