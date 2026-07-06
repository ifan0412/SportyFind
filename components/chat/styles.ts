/** Shared chat bubble layout classes */
export const CHAT_BUBBLE_ROW = "flex w-full flex-col";
export const CHAT_BUBBLE_ROW_ME = `${CHAT_BUBBLE_ROW} items-end`;
export const CHAT_BUBBLE_ROW_THEM = `${CHAT_BUBBLE_ROW} items-start`;

export const CHAT_BUBBLE =
  "inline-block max-w-[88%] sm:max-w-[78%] lg:max-w-[68%] px-4 py-3 sm:px-5 sm:py-3.5 text-[15px] sm:text-base leading-relaxed break-words shadow-sm";

export const CHAT_BUBBLE_ME =
  `${CHAT_BUBBLE} bg-blue-600 text-white rounded-2xl rounded-br-sm`;

export const CHAT_BUBBLE_THEM =
  `${CHAT_BUBBLE} bg-slate-800 text-slate-100 rounded-2xl rounded-bl-sm border border-slate-700/80`;
