const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles"),
      shop = require("/app/util/shop")

module.exports = {
  name: "lootbox",
  run: async (client, message, args, shared) => {
    let am = parseInt(args[0], 10)
    if (!isNaN(am)) args.pop()
    else am = 1
    let item = shop["lootbox"]
    let rb = players.get(message.author.id+".inventory."+item.itemid)
    if(rb < 1) return await message.channel.send(`You do not have any lootboxes.`)
    message.channel.send(`Sorry! Lootboxes are unable to be used right now`)
  }
}