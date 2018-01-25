const request = require("request-promise-native");
const fs = require("fs");
const EventEmitter = require("events").EventEmitter;

const config = require("./config.js");

class Parser extends EventEmitter {
  constructor(seedId) {
    super();
    this.index(seedId);
    this.prefilterFunction = false;
  }

  index(nextChangeId) {
    console.time("load");
    console.log(`Loading ${nextChangeId}`);
    request({
      method: "GET",
      gzip: true,
      uri: `https://www.pathofexile.com/api/public-stash-tabs?id=${nextChangeId}`
    }).then((res) => {
      console.timeEnd("load");

      let nextChangeId = this.parse(res);

      setTimeout((() => {
        this.index(nextChangeId);
      }), 1000);
    });
  }

  setPrefilter(func) {
    if (typeof func === "function") {
      this.prefilterFunction = func;
    } else {
      throw new TypeError("Invalid function passed!");
    }
  }

  prefilter(item) {
    if (this.prefilterFunction) {
      return this.prefilterFunction(item);
    }
    console.log("Using default");

    return true;
  }

  isPrice(str) {
    return config.priceRegex.test(str);
  }

  parse(data) {
    console.time("parse");
    // eslint-disable-next-line camelcase
    const { next_change_id, stashes } = JSON.parse(data);
    console.timeEnd("parse");

    console.log(`Found ${stashes.length} stashes`);

    for (let stash of stashes) {
      const { id, accountName, lastCharacterName } = stash;
      this.emit("stash", id);
      let price = false;

      if (this.isPrice(stash.stash)) {
        price = stash.stash;
      }

      for (let item of stash.items) {
        if (!this.isPrice(item.note)) item.note = price;
        if (!this.prefilter(item)) continue;
        this.emit("item", item, { id, accountName, lastCharacterName });
      }
    }

    return next_change_id;
  }
}

module.exports = Parser;
