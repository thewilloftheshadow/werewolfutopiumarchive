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
  name: "rose",
  run: async (client, message, args, shared) => {
    //return;
    // console.log(args)
    let rb = players.get(message.author.id+".inventory.rose")
    // console.log(rb)
    if(!rb || rb < 1) return await message.channel.send(`Hey there! You can't give people roses if you haven't bought any! Go buy some in the shop first!`)
    //if(!message.author.id === "439223656200273932") return await message.channel.send("Sorry! Roses are unable to be given to people right now")
    let player = players.get(message.author.id)
    let r
    if (player.currentGame) {
      let QuickGames = games.get("quick"),
          game = QuickGames.find(g => g.gameID == player.currentGame),
          index = QuickGames.indexOf(game),
          gamePlayer = game.players.find(player => player.id == message.author.id)
      let target = parseInt(args[0])
      if (isNaN(target) || target > game.players.length || target < 1)
        return await message.author.send("Invalid target.") 
      r = fn.getUser(client, game.players[target-1])
    } else {
      r = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => {})
      if(!r) return await message.channel.send("Unable to find that user.")
    }
    if (r.id == message.author.id)
      return await message.channel.send("I know you are lonely, but please don't do that. I'm sure we can find you some friends to give roses to.")
    
    await r.send(
      new Discord.MessageEmbed()
      .setTitle("Roses for you")
      .setDescription(
        `You were given a rose by ${r}!`
      )
      .setThumbnail(fn.getEmoji(client, "Rose").url)
    )
    await message.channel.send(`Success! You've given a ${fn.getEmoji(client, "Rose")} rose to ${nicknames.get(r.id)}!`)
    players.add(r.id+".roses", 1)
    players.set(message.author.id+"inventory.rose", 1)
  }
}