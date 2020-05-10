module.exports = {
  "lootbox": {
    price: 10,
    name: "Lootbox",
    description: "Just a common lootbox with ordinary stuff",
    itemid: "lootbox",
    unavailable: false,
    emoji: "lootbox",
    currency: "roses",
    plural: "es",
    aliases: ["lb"]
  },
  "apprentice lootbox": {
    price: 20,
    name: "Apprentice Lootbox",
    description: "The medium-tier lootbox, with sorta good stuff.",
    itemid: "apprentice lootbox",
    unavailable: false,
    emoji: "apprentice lootbox",
    currency: "roses",
    plural: "es",
    aliases: ["alb","applb"]
  },
  "master lootbox": {
    price: 1e+99,
    name: "Master Lootbox",
    description: "The high-tier lootbox, with the pro-gamer stuff.",
    itemid: "master lootbox",
    unavailable: false,
    emoji: "master lootbox",
    currency: "roses",
    plural: "es",
    aliases: ["mlb", "masterlb"]
  },
  "rose": {
    price: 25,
    name: "Rose",
    description: "A single rose, given out of love (and coins)",
    itemid: "rose",
    unavailable: false,
    emoji: "rose",
    currency: "coins",
    plural: "s"
  },
  "rose bouquet": {
    price: 250,
    name: "Rose Bouquet",
    description:
      "A set of 16 roses, given out of even more love (and even more coins)",
    itemid: "rose bouquet",
    unavailable: true,
    emoji: "rose bouquet",
    currency: "coins",
    plural: "s",
    aliases: ["bouquet"]
  },
  "custom maker": {
    price: 1500,
    name: "Custom Maker",
    description:
      "Buy this to be able to make custom games to play with your friends!",
    itemid: "custom maker",
    unavailable: false,
    emoji: "random",
    currency: "coins",
    plural: "",
    aliases: ["cmi"]
  },
  "private channel": {
    price: 3000,
    name: "Private Channel",
    description:
      "Buy this to be able to get a private channel to chat with your friends!",
    itemid: "private channel",
    unavailable: false,
    emoji: "Private",
    currency: "coins",
    plural: "",
    // aliases: ["prv"]
  },
  "talisman": {
    price: 25,
    name: "Talisman",
    description:
    "Using this item gives you an extra chance to be the role of the talisman in a game!",
    itemid: "talisman",
    unavailable: false,
    emoji: "Talisman",
    currency: "coins",
    plural: "s"
  }
}
