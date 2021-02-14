"use strict";
import * as NODE_TYPE from "./type";

import {isHyphen, node2Punctuation, PUNCTUATION} from "./parser_node";
import stringWidth from "string-width";
import {isPunctuation, isSymbol} from "nlcst-types";
import {Node} from "unist";

const visit = require("unist-util-visit");
const Parser = require("parse-english");
const toString = require("nlcst-to-string");
const modifyChildren = require("unist-util-modify-children");

const isStartOrEndInArray = (i, children) => {
  return i === 0 || children.length - 1 === i;
};

function ParseChinese(doc, file) {
  if (!(this instanceof ParseChinese)) {
    // @ts-ignore
    return new ParseChinese(doc, file);
  }

  Parser.apply(this, arguments);
}

module.exports = ParseChinese;

ParserPrototype.prototype = Parser.prototype;

function ParserPrototype() {
}

let proto = new ParserPrototype();

ParseChinese.prototype = proto;

// // Add modifiers to `parser`.
// proto.tokenizeParagraphPlugins = [modifyChildren(changeSentence)].concat(
//   proto.tokenizeParagraphPlugins
// );

const NEWLINE_CHARS = "。！？";

proto.tokenizeRootPlugins = [
  modifyChildren(addSentenceMeta)
].concat(proto.tokenizeRootPlugins);

function createNewSentence(children) {
  return {
    type: "SentenceNode",
    children: children,
    position: {
      start: children[0].position.start,
      end: children[children.length - 1].position.end
    }
  };
}

function isShortCode(sen) {
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

function addSentenceMeta(tree, index, parent) {

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
    visit(sentence, ["TextNode", "PunctuationNode"], (node: any, i, parent) => {
      if (node.type === "TextNode") {
        node.isFull = node.value.length !== stringWidth(node.value);
      } else if (node.type === "PunctuationNode") {
        node2Punctuation(node);
        if (isHyphen(node) && !isStartOrEndInArray(i, parent.children)) {
          const last:Node = parent.children[i - 1];
          const next:Node = parent.children[i + 1];
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