export {Punctuation, SentenceNode, Word, Paragraph, Sentence, WhiteSpace, Text, PunctuationNode} from "./node"
export {
  PUNCTUATION,
  punctuationNodeSetMeta,
  isRightParenthesis,
  isHyphen,
  isSlash,
  isComma,
  isCnCOLON,
  isLeftParenthesis,
  isPause,
  PUNCTUATION_META
} from "./punctuation"

export * as NODE_TYPE from "./node"
const  Chinese = require("./parser");
const unherit = require('unherit')

module.exports = parse
parse.Parser = Chinese

function parse() {
  // @ts-ignore
  this.Parser = unherit(Chinese)
}
