import {isPunctuation, isSymbol, Root} from "nlcst-types";
import * as NODE_TYPE from "./node";
import stringWidth from "string-width";
import {Node, Parent} from "unist";
import {isHyphen, punctuationNodeSetMeta} from "./punctuation";

const Parser = require("parse-english");
const modifyChildren = require("unist-util-modify-children");

const visit = require("unist-util-visit");
const toString = require("nlcst-to-string");
const NEWLINE_CHARS = "。！？";

// @ts-ignore
function ParseChinese(doc, file) {

  // @ts-ignore
  if (!(this instanceof ParseChinese)) {
    // @ts-ignore
    return new ParseChinese(doc, file);
  }
  // @ts-ignore
  Parser.apply(this, arguments);
}

module.exports = ParseChinese;

ParserPrototype.prototype = Parser.prototype;

function ParserPrototype() {
}

// @ts-ignore

let proto = new ParserPrototype();

ParseChinese.prototype = proto;

proto.tokenizeRootPlugins = [
  modifyChildren(addSentenceMeta)
].concat(proto.tokenizeRootPlugins);

function addSentenceMeta(tree: Root) {
  visit(tree, NODE_TYPE.Paragraph, (parent: any) => {
    let children = [];
    for (let node of parent.children) {
      if (node.type === NODE_TYPE.Sentence) {
        let sentenceChildren = [];

        for (let sentence_node of node.children) {
          sentenceChildren.push(sentence_node);
          // 中文换行
          if (
            sentence_node.type === NODE_TYPE.Punctuation &&
            NEWLINE_CHARS.indexOf(sentence_node.value) > -1
          ) {
            children.push(createNewSentence(sentenceChildren));
            sentenceChildren = [];
          }

          if (sentence_node.type === NODE_TYPE.Word) {
            const v = toString(sentence_node);
            sentence_node.isFull = v.length !== stringWidth(v);
          }
        }
        if (sentenceChildren.length > 0) {
          let sen = createNewSentence(sentenceChildren);
          if (!isShortCode(sen)) {
            children.push(createNewSentence(sentenceChildren));
          }
        }
      } else {
        children.push(node);
      }
    }
    parent.children = children;
  });

  visit(tree, "SentenceNode", (sentence: any) => {
    sentence.isFull = false;
    sentence.index = {punctuation: 0};
    visit(sentence, ["TextNode", "PunctuationNode"], (node: any, i: number, parent: Parent) => {
      if (node.type === "TextNode") {
        node.isFull = node.value.length !== stringWidth(node.value);
      } else if (node.type === "PunctuationNode") {
        punctuationNodeSetMeta(node);
        if (isHyphen(node) && !isStartOrEndInArray(i, parent.children)) {
          const last = parent.children[i - 1];
          const next = parent.children[i + 1];
          if (isSymbol(last) && last.value === "<") {
            last.value = "<-"
            parent.children.splice(i, 1)
          } else if (isSymbol(next) && next.value === ">") {
            last.value = "->"
            parent.children.splice(i, 1)
          }

        }
      }
    });

    for (let node of sentence.children) {
      if (node.type === NODE_TYPE.Word) {
        sentence.isFull = node.isFull || sentence.isFull;
      }

      if (node.type === NODE_TYPE.Punctuation) {
        sentence.index.punctuation += 1;
      }
    }
  });
}


function isShortCode(sen: Parent) {
  let first, last;
  for (let child of sen.children) {
    if (isPunctuation(child)) {
      if (!first) {
        first = child;
      }
      last = child;
    }
  }

  return isPunctuation(first) &&
    first.value === "{{" &&
    isPunctuation(last) &&
    last.value === "}}";
}


export const isStartOrEndInArray = (i: number, children: Node[]) => {
  return i === 0 || children.length - 1 === i;
};


function createNewSentence(children: Node[]): Parent {
  const start = children[0];
  const end = children[children.length - 1];
  return {
    type: "SentenceNode",
    children: children,
    position: (start.position && end.position) ? {
      start: start.position.start,
      end: end.position.end
    } : undefined,
  };
}
