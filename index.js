const request = require("request-promise-native");
const fs = require("fs");
const EventEmitter = require("events").EventEmitter;

const config = require("./config.js");
const constants = require("./constants.js");

class Parser extends EventEmitter {
  constructor(seedId) {
    super();
    this.index(seedId);
    this.prefilterFunction = false;
  }

  static get constants() {
    return constants;
  }

  index(nextChangeId) {
    this.emit("nextChangeId", nextChangeId);
    request({
      method: "GET",
      gzip: true,
      uri: `https://www.pathofexile.com/api/public-stash-tabs?id=${nextChangeId}`
    }).then((res) => {
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

    return true;
  }

  isPrice(str) {
    return config.priceRegex.test(str);
  }

  parse(data) {
    // eslint-disable-next-line camelcase
    const { next_change_id, stashes } = JSON.parse(data);

    for (let stash of stashes) {
      const { id, accountName, lastCharacterName } = stash;
      let price = false;

      if (this.isPrice(stash.stash)) {
        price = stash.stash;
      }

      const validItems = [];

      for (let item of stash.items) {
        item.name = item.name.replace("<<set:MS>><<set:M>><<set:S>>", "");

        if (typeof item.category === "object") {
          const firstKey = Object.keys(item.category)[0];
          if (["cards", "jewels", "flasks", "currency", "maps"].indexOf(firstKey) > -1) {
            item.category = firstKey;
          }
          else {
            item.category = Object.values(item.category)[0][0];
          }
        }
        
        if (!this.isPrice(item.note)) item.note = price;
        if (!this.prefilter(item)) continue;
        this.emit("item", item, { id, accountName, lastCharacterName });

        validItems.push(item);
      }
      
      stash.items = validItems;

      this.emit("stash", stash);
    }

    // eslint-disable-next-line camelcase
    return next_change_id;
  }
}

module.exports = Parser;
