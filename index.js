const request = require("request-promise-native");
const fs = require("fs");

class Parser {
  constructor() {
    // this.index("130421756-136435140-128025087-147467601-137980388");
    this.parse(fs.readFileSync("test.json"));
  }

  index(nextChangeId) {
    console.time("load");
    console.log(`Loading ${nextChangeId}`);
    request(`https://www.pathofexile.com/api/public-stash-tabs?id=${nextChangeId}`).then((res) => {
      console.timeEnd("load");

      this.parse(res);

      setTimeout((() => {
        this.index(nextChangeId);
      }), 1000);
    });
  }

  parse(data) {
    console.time("parse");
    const { nextChangeId, stashes } = JSON.parse(data);
    console.timeEnd("parse");

    console.log(stashes);

    for (let stash of stashes) {
      
    }

    return nextChangeId;
  }
}

module.exports = Parser;
