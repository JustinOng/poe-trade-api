const request = require("request-promise-native");
const fs = require("fs");
const EventEmitter = require("events").EventEmitter;

const config = require("./config.js");
const constants = require("./constants.js");

const currencyTypeMap = {
  cartographer: "chisel",
  fusing: "fuse",
  gemcutter: "gcp",
  exalted: "exa"
};

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
    this.emit("loading");
    const curChangeId = nextChangeId;
    request({
      method: "GET",
      gzip: true,
      uri: `https://www.pathofexile.com/api/public-stash-tabs?id=${nextChangeId}`
    }).then((res) => {
      this.emit("loaded");
      let nextChangeId = this.parse(res);

      this.emit("nextChangeId", curChangeId);
      this.emit("parsed");

      setTimeout((() => {
        this.index(nextChangeId);
      }), 1000);
    }).catch((err) => {
      this.emit("error", err);

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
          } else {
            item.category = Object.values(item.category)[0][0];
          }
        }

        if (!this.isPrice(item.note)) item.note = price;
        if (!this.prefilter(item)) continue;

        if (this.isPrice(item.note)) {
          const match = item.note.match(config.priceRegex);

          item.price = {
            quantity: parseInt(match[2], 10),
            type: match[3]
          };

          if (currencyTypeMap[item.price.type]) {
            item.price.type = currencyTypeMap[item.price.type];
          }
        }

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
