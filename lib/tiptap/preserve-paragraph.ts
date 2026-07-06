import Paragraph from "@tiptap/extension-paragraph";
import { mergeAttributes } from "@tiptap/core";

/** Serialize empty paragraphs with <br> so blank lines survive storage and render */
export const PreserveEmptyParagraph = Paragraph.extend({
  renderHTML({ node, HTMLAttributes }) {
    if (node.content.size === 0) {
      return ["p", mergeAttributes(HTMLAttributes), ["br"]];
    }
    return ["p", mergeAttributes(HTMLAttributes), 0];
  },
});
