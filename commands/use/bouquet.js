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
  name: "bouquet",
  aliases: ["rose bouquet"],
  run: async (client, message, args, shared) => {
    //return;
    console.log(args)
    let rb = players.get(message.author.id+".inventory.rose bouquet")
    console.log(rb)
    if(!rb || rb < 1) return await message.channel.send(`Hey there! You can't give out ${fn.getEmoji(client, "Rose_Bouquet")} Rose Bouquets if you haven't bought any! Go buy some in the shop first!`)
    let player = players.get(message.author.id)
    if (!player.currentGame) return await message.channel.send(`You can only give out ${fn.getEmoji(client, "Rose_Bouquet")} Rose Bouquets when you are in a game!`)
    let QuickGames = games.get("quick"),
          game = QuickGames.find(g => g.gameID == player.currentGame),
          index = QuickGames.indexOf(game),
          gamePlayer = game.players.find(player => player.id == message.author.id)
    game.players.forEach(p => {
      if(p.id === message.author.id) return
      client.users.cache.get(p.id).send(
      new Discord.MessageEmbed()
      .setTitle("Roses for you")
      .setDescription(
        `You were given a rose from a bouquet by ${nicknames.get(message.author.id)} in Game #${player.currentGame}!`
      )
      .setThumbnail(fn.getEmoji(client, "Rose Bouquet").url)
    )
      players.add(player.id+".roses", 1)
    })
    await message.channel.send(`Success! You've given a ${fn.getEmoji(client, "Rose Bouquet")} rose to everyone in Game #${player.currentGame}!`)
    players.subtract(message.author.id+"inventory.rose bouquet", 1)
  }
}