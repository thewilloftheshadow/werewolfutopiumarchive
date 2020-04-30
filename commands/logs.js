const Discord = require('discord.js'),
      moment = require('moment'),
      db = require("quick.db"),
      handybag = require("handybag")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames"),
      temp = new db.table("Temp"),
      authdb = new db.table("authdb"),
      logs = new db.table("Logs")

const config = require('/app/util/config'),
      fn = require('/app/util/fn'),
      roles = require('/app/util/roles'),
      tags = require('/app/util/tags'),
      shop = require("/app/util/shop")

module.exports = {
	name: "logs",
	usage: "logs <file|db> <game ID>",
	run: async (client, message, args, shared) => {
    if (!["336389636878368770","658481926213992498","439223656200273932"].includes(message.author.id)) return;
    if(!(["file", "db"].includes(args[0]))) return await message.channel.send("Please specify db or file")
  }
}

