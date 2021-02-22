const  Chinese = require("./parser");
const unherit = require('unherit')

module.exports = parse
parse.Parser = Chinese

function parse() {
  // @ts-ignore
  this.Parser = unherit(Chinese)
}
