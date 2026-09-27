/**
 * domCache.js: Cached DOM element references
 *
 * Single call to cacheDom() populates the DOM object with all
 * frequently-accessed elements. Separated from state.js for clarity.
 */

export const DOM = {};

export function cacheDom() {
  DOM.cloudContainer    = document.getElementById("cloud-container");
  DOM.pickNextBtn       = document.getElementById("pick-next-btn");
  DOM.startCta          = document.getElementById("start-cta");
  DOM.startBtn          = document.getElementById("start-btn");
  DOM.startTeam         = document.getElementById("start-team");
  DOM.startSettings     = document.getElementById("start-settings");
  DOM.pauseBtn          = document.getElementById("pause-btn");
  DOM.endSessionBtn     = document.getElementById("end-session-btn");
  DOM.editBtn           = document.getElementById("edit-btn");
  DOM.resetBtn          = document.getElementById("reset-btn");
  DOM.timerValue        = document.getElementById("timer-value");
  DOM.timerBarFill      = document.getElementById("timer-bar-fill");
  DOM.timerInput        = document.getElementById("timer-input");
  DOM.timerModeBtn      = document.getElementById("timer-mode-btn");
  DOM.orderModeBtn      = document.getElementById("order-mode-btn");
  DOM.modeBtns          = document.querySelectorAll(".mode-btn");
  DOM.statusDot         = document.getElementById("status-dot");
  DOM.statusText        = document.getElementById("status-text");
  DOM.participantCount  = document.getElementById("participant-count");
  DOM.turnBar           = document.getElementById("turn-bar");
  DOM.turnBarActions    = document.querySelector(".turn-bar-actions");
  DOM.sidebarCurrentName = document.getElementById("sidebar-current-name");
  DOM.sidebarCurrentTopic = document.getElementById("sidebar-current-topic");
  DOM.topicBar          = document.getElementById("topic-bar");
  DOM.topicBarText      = document.getElementById("topic-bar-text");
  DOM.turnCounter       = document.getElementById("turn-counter");
  DOM.skipBtn           = document.getElementById("skip-btn");
  DOM.recapPanel        = document.getElementById("recap-panel");
  DOM.recapTitle        = document.getElementById("recap-title");
  DOM.recapTime         = document.getElementById("recap-time");
  DOM.recapBody         = document.getElementById("recap-body");
  DOM.recapAgainBtn     = document.getElementById("recap-again-btn");
  DOM.recapCloseBtn     = document.getElementById("recap-close-btn");
  DOM.winnersLane       = document.getElementById("winners-lane");
  DOM.winnersLaneList   = document.getElementById("winners-lane-list");

  // Progress Lane
  DOM.progressLane      = document.getElementById("progress-lane");
  DOM.progressLaneList  = document.getElementById("progress-lane-list");

  // App Prompt Dialog
  DOM.appPromptDialog   = document.getElementById("app-prompt-dialog");
  DOM.appPromptTitle    = document.getElementById("app-prompt-title");
  DOM.appPromptMessage  = document.getElementById("app-prompt-message");
  DOM.appPromptInputWrap = document.getElementById("app-prompt-input-wrap");
  DOM.appPromptInput    = document.getElementById("app-prompt-input");
  DOM.appPromptError    = document.getElementById("app-prompt-error");
  DOM.appPromptCancel   = document.getElementById("app-prompt-cancel");
  DOM.appPromptConfirm  = document.getElementById("app-prompt-confirm");
  DOM.appPromptClose    = document.getElementById("app-prompt-close");

  // Hot Seat
  DOM.settingsHotseat   = document.getElementById("settings-hotseat");
  DOM.hotseatQuestionListSelect = document.getElementById("hotseat-question-list-select");
  DOM.hotseatQuestionsPerPerson = document.getElementById("hotseat-questions-per-person");
  DOM.hotseatTimerInput = document.getElementById("hotseat-timer-input");
  DOM.hotseatCard       = document.getElementById("hotseat-card");
  DOM.hotseatCardName   = document.getElementById("hotseat-card-name");
  DOM.hotseatCardCounter = document.getElementById("hotseat-card-counter");
  DOM.hotseatCardQuestion = document.getElementById("hotseat-card-question");
  DOM.hotseatSkipBtn    = document.getElementById("hotseat-skip-btn");
  DOM.hotseatNextQBtn   = document.getElementById("hotseat-next-q-btn");

  // Question editor
  DOM.questionEditorDialog = document.getElementById("question-editor-dialog");
  DOM.questionEditorRows = document.getElementById("question-editor-rows");
  DOM.questionEditorError = document.getElementById("question-editor-error");
  DOM.addQuestionBtn    = document.getElementById("add-question-btn");
  DOM.saveQuestionEditorBtn = document.getElementById("save-question-editor-btn");
  DOM.closeQuestionEditorBtn = document.getElementById("close-question-editor-btn");
  DOM.questionRowTemplate = document.getElementById("question-row-template");

  // Stage FAB buttons + floating panels + idle context
  DOM.stageFab          = document.getElementById("stage-fab");
  DOM.exitBtn           = document.getElementById("exit-btn");
  DOM.fabSettingsBtn    = document.getElementById("fab-settings-btn");
  DOM.sidebarCloseBtn   = document.getElementById("sidebar-close-btn");
  DOM.shareTeamBtn      = document.getElementById("share-team-btn");

  // Presenter mode
  DOM.presenterModeBtn  = document.getElementById("presenter-mode-btn");
  DOM.historyList       = document.getElementById("history-list");
  DOM.endSection        = document.getElementById("end-section");

  // Team dropdown
  DOM.teamSelect        = document.getElementById("team-select");
  DOM.newTeamBtn        = document.getElementById("new-team-btn");
  DOM.deleteTeamBtn     = document.getElementById("delete-team-btn");

  // Topic list dropdown
  DOM.topicListSelect   = document.getElementById("topic-list-select");
  DOM.icebreakerTopicListSelect = document.getElementById("icebreaker-topic-list-select");
  DOM.newTopicListBtn   = document.getElementById("new-topic-list-btn");
  DOM.editTopicsBtn     = document.getElementById("edit-topics-btn");

  // Mode-aware settings
  DOM.settingsStandup   = document.getElementById("settings-standup");
  DOM.settingsRaffle    = document.getElementById("settings-raffle");
  DOM.settingsIcebreaker = document.getElementById("settings-icebreaker");
  DOM.prizeCountInput   = document.getElementById("prize-count-input");
  DOM.icebreakerTimerInput = document.getElementById("icebreaker-timer-input");
  DOM.topicRotationBtn  = document.getElementById("topic-rotation-btn");
  DOM.repeatPeopleBtn   = document.getElementById("repeat-people-btn");
  DOM.repeatTopicsBtn   = document.getElementById("repeat-topics-btn");

  // Sidebar action bar
  DOM.editActionWrap    = document.getElementById("edit-action-wrap");
  DOM.newActionWrap     = document.getElementById("new-action-wrap");
  DOM.editMenu          = document.getElementById("edit-menu");
  DOM.newMenu           = document.getElementById("new-menu");
  DOM.editTeamMenuBtn   = document.getElementById("edit-team-menu-btn");
  DOM.editTopicsMenuBtn = document.getElementById("edit-topics-menu-btn");
  DOM.newTeamMenuBtn    = document.getElementById("new-team-menu-btn");
  DOM.newTopicsMenuBtn  = document.getElementById("new-topics-menu-btn");

  // Participant editor
  DOM.editorDialog      = document.getElementById("editor-dialog");
  DOM.editorTeamName    = document.getElementById("editor-team-name");
  DOM.editorDefaultTimer = document.getElementById("editor-default-timer");
  DOM.editorRows        = document.getElementById("editor-rows");
  DOM.editorError       = document.getElementById("editor-error");
  DOM.saveEditorBtn     = document.getElementById("save-editor-btn");
  DOM.closeEditorBtn    = document.getElementById("close-editor-btn");
  DOM.rowTemplate       = document.getElementById("editor-row-template");

  // Topic editor
  DOM.topicEditorDialog = document.getElementById("topic-editor-dialog");
  DOM.topicEditorRows   = document.getElementById("topic-editor-rows");
  DOM.topicEditorError  = document.getElementById("topic-editor-error");
  DOM.addTopicBtn       = document.getElementById("add-topic-btn");
  DOM.saveTopicEditorBtn = document.getElementById("save-topic-editor-btn");
  DOM.closeTopicEditorBtn = document.getElementById("close-topic-editor-btn");
  DOM.topicRowTemplate  = document.getElementById("topic-row-template");


  // Editor paste
  DOM.editorPasteToggle = document.getElementById("editor-paste-toggle");
  DOM.editorPasteArea   = document.getElementById("editor-paste-area");
  DOM.editorPasteInput  = document.getElementById("editor-paste-input");
  DOM.editorPasteAdd    = document.getElementById("editor-paste-add");

  // Keyboard help
  DOM.keyboardHelp      = document.getElementById("keyboard-help");

  // Data management
  DOM.exportBtn         = document.getElementById("export-btn");
  DOM.importBtn         = document.getElementById("import-btn");
  DOM.importFileInput   = document.getElementById("import-file-input");

  // Sidebar (panels open it via "Configure")
  DOM.sidebarBackdrop   = document.getElementById("sidebar-backdrop");
  DOM.sidebar           = document.querySelector(".sidebar");

  // Mobile action bar
  DOM.mobileEditBtn     = document.getElementById("mobile-edit-btn");
  DOM.mobileNewBtn      = document.getElementById("mobile-new-btn");
  DOM.mobileEditMenu    = document.getElementById("mobile-edit-menu");
  DOM.mobileNewMenu     = document.getElementById("mobile-new-menu");
  DOM.mobileEditTeamBtn = document.getElementById("mobile-edit-team-menu-btn");
  DOM.mobileEditTopicsBtn = document.getElementById("mobile-edit-topics-menu-btn");
  DOM.mobileNewTeamBtn  = document.getElementById("mobile-new-team-menu-btn");
  DOM.mobileNewTopicsBtn = document.getElementById("mobile-new-topics-menu-btn");
}
