// conversationStore.js — single source of truth for the current call conversation.
// Text page uses its own localStorage-based textHistory.js and is not affected here.

let _history = []; // { role: 'user' | 'yuki', text: string }

/** Clear history at the start of a new call. */
export function resetCallHistory() {
  _history = [];
}

/** Add one message. role must be 'user' or 'yuki'. */
export function pushCallMessage(role, text) {
  _history.push({ role, text });
}

/** Full history copy — used when saving to localStorage for Summary. */
export function getCallHistory() {
  return [..._history];
}

/**
 * History formatted for buildPrompt (which embeds history as text).
 * Uses role 'user' | 'assistant' to match Claude's expected labels.
 */
export function getCallApiHistory() {
  return _history.map(m => ({
    role: m.role === 'yuki' ? 'assistant' : 'user',
    text: m.text,
  }));
}

/**
 * History formatted as Claude API messages array ({ role, content }).
 * Optionally exclude the last N entries (useful before appending an image turn).
 */
export function getCallApiMessages({ excludeLast = 0 } = {}) {
  const slice = excludeLast > 0 ? _history.slice(0, -excludeLast) : _history;
  return slice.map(m => ({
    role: m.role === 'yuki' ? 'assistant' : 'user',
    content: m.text,
  }));
}
