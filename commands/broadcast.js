const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles"),
      logs = new db.table("Logs")

module.exports = {
  name: "broadcast",
  run: async (client, message, args, shared) => {
    if (
      !client
        .guilds.cache.get("522638136635817986")
        .members.cache.get(message.author.id)
        .roles.cache.find(r => ["βTester Helper", "Developer"].includes(r.name))
    )
      return;
    
    let QuickGames = games.get("quick"),
        game = QuickGames.find(
          g => g.mode == "custom"
                 ? g.gameID.toLowerCase() == args[0].toLowerCase()
                 : g.gameID == args[0]
        )
    
    if (!game) return await message.channel.send(
      new Discord.MessageEmbed()
        .setColor("RED")
        .setTitle("No results found.")
    )
    
    let content = message.content.slice(13+args[0].length)
    
    fn.broadcastTo(
      client, game.players.filter(p => !p.left),
      new Discord.MessageEmbed()
        .setColor("GOLD")
        .setTitle("📢 Broadcast")
        .setDescription(content)
    )
  }
}