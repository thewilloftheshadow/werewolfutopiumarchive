const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db"),
      Canvas = require("canvas"),
      probe = require('probe-image-size');

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles"),
      shop = require("/app/util/shop")

module.exports = {
  name: "talisman",
  aliases: ["tali"],
  run: async (client, message, args) => {
    await message.channel.send(`Here is your talisman:`, await fn.createTalisman(client, args.join(' ')));
  }
}