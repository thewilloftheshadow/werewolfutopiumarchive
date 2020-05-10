const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db"),
      fs = require("fs")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles"),
      shop = require("/app/util/shop")

const bouquet = require("/app/commands/use/bouquet")

module.exports = {
  name: "bouquet",
  run: async (client, message, args, shared) => {
    await bouquet.run(client, message, args, shared)
  }
}