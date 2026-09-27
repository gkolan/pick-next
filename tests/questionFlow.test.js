import { afterEach, expect, it } from 'vitest';
import { waitForNextQuestion, handleHotSeatNextQuestion, cancelQuestion, questionResolve } from '../js/questionFlow.js';

afterEach(cancelQuestion);

it('cancels a waiter without recording an answer and releases its callback', async () => {
  const pending = waitForNextQuestion();
  cancelQuestion();
  expect(questionResolve).toBeNull();
  await expect(pending).resolves.toBeNull();
});

it('settles a replaced waiter and keeps the new question independent', async () => {
  const old = waitForNextQuestion();
  const current = waitForNextQuestion();
  await expect(old).resolves.toBeNull();
  handleHotSeatNextQuestion(false);
  handleHotSeatNextQuestion(true);
  await expect(current).resolves.toBe(false);
  expect(questionResolve).toBeNull();
});
