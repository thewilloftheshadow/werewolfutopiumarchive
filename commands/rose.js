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

const rose = require("/app/commands/use/rose")

module.exports = {
  name: "rose",
  run: async (client, message, args, shared) => {
    await rose.run(client, message, args, shared)
  }
}