// bridge.js — centralizes all window.* assignments so HTML onclick=".." and
// app.js can reliably find functions regardless of module load order.
// Must be listed as a <script type="module"> BEFORE app.js in index.html.

import {
  appendChatMessage,
  triggerOpeningMessage,
  initCallInput,
  applyCallCaptionMode,
  getCallCaptionMode,
  toggleCallCaptionMode,
} from './pages/Call/Call.js';

import {
  initTextPage,
  initTextPageForChar,
} from './pages/Text/Text.js';

window.appendChatMessage      = appendChatMessage;
window.triggerOpeningMessage  = triggerOpeningMessage;
window.initCallInput          = initCallInput;
window.applyCallCaptionMode   = applyCallCaptionMode;
window.getCallCaptionMode     = getCallCaptionMode;
window.toggleCallCaptionMode  = toggleCallCaptionMode;

window.initTextPage           = initTextPage;
window.initTextPageForChar    = initTextPageForChar;
