/** One pending Hot Seat question. Cancellation settles the old waiter without recording an answer. */
export let questionResolve = null;

export function waitForNextQuestion() {
  cancelQuestion();
  return new Promise(resolve => { questionResolve = resolve; });
}

export function handleHotSeatNextQuestion(skipped) {
  const resolve = questionResolve;
  questionResolve = null;
  resolve?.(skipped);
}

export function cancelQuestion() {
  handleHotSeatNextQuestion(null);
}
