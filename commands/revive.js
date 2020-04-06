const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles")

module.exports = {
  name: "revive",
  aliases: ["rev"],
  gameroles: ["Medium"],
  run: async (client, message, args, shared) => {
    let player = players.get(message.author.id)
    if (!player.currentGame) 
      return await message.author.send("**You are not currently in a game!**\nDo `w!quick` to join a Quick Game!")
    
    let QuickGames = games.get("quick"),
        game = QuickGames.find(g => g.gameID == player.currentGame),
        index = QuickGames.indexOf(game),
        gamePlayer = game.players.find(player => player.id == message.author.id)
    
    if (gamePlayer.role != "Medium")
      return await message.author.send("You do not have the abilities to revive a player.")
    if (!gamePlayer.alive)
      return await message.author.send("You are dead. You can no longer revive a player.")
    
    if (game.currentPhase % 3 != 0)
      return await message.author.send("You can only revive a player during the night.")
    if (gamePlayer.jailed)
      return await message.author.send("You are currently jailed and you cannot use your abilities!")
    if (gamePlayer.nightmared)
      return await message.author.send("You are having a nightmare and cannot use your abilities!")
    if (game.currentPhase >= 999)
      return await message.author.send("The game is over! You can no longer use your actions.")
    
    if (!gamePlayer.abil1)
      return await message.author.send("You have already revived a player.")
    
    let target = parseInt(args[0])
    if (isNaN(target) || target > game.players.length || target < 1)
      return await message.author.send("Invalid target.")
    
    let targetPlayer = game.players[target-1]
    if (targetPlayer.alive)
      return await message.author.send("You cannot revive an alive player.")
    if (roles[targetPlayer.role].team !== "Village")
      return await message.author.send("You can only revive villagers!")
    if (targetPlayer.boxed && game.players.find(p => p.role == "Soul Collector" && p.alive))
      return await message.author.send("You cannot revive trapped souls!")
    
    gamePlayer.usedAbilityTonight = targetPlayer.number
    
    message.author.send(
      `${fn.getEmoji(client, "Medium Revive")
      } You selected **${target} ${nicknames.get(targetPlayer.id)}** to be revived.`
    )
    
    QuickGames[index] = game
    
    games.set("quick", QuickGames)
  }
}