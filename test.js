const Parser = require("./");

const parser = new Parser("136044720-142322424-133609783-153702629-143965596");

parser.setPrefilter((item) => {
  const { constants } = Parser;

  if (!(
    item.frameType === constants.frameType.unique ||
    item.frameType === constants.frameType.divinationCard ||
    item.frameType === constants.frameType.prophecy
  )) {
    return false;
  }

  if (!parser.isPrice(item.note)) return false;

  //if (!item.verified) return false;

  return true;
});

parser.on("stash", (stash) => {
  console.log("updating", stash);
});

parser.on("item", (item) => {
  //console.log("Item:", item);
})

setInterval(()=>{}, 1000);
