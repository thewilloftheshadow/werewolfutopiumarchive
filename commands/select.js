const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles")

module.exports = {
  name: "select",
  gameroles: ["Loudmouth"],
  run: async (client, message, args, shared) => {
    let player = players.get(message.author.id)
    if (!player.currentGame) 
      return await message.author.send("**You are not currently in a game!**\nDo `w!quick` to join a Quick Game!")
    
    let QuickGames = games.get("quick"),
        game = QuickGames.find(g => g.gameID == player.currentGame),
        index = QuickGames.indexOf(game),
        gamePlayer = game.players.find(player => player.id == message.author.id)
    
    if (!gamePlayer.alive)
      return await message.author.send("You are dead. You can no longer reveal a player's role!")
      
    if (game.currentPhase % 3 !== 0)
      return await message.author.send("You can only sect a player during the night!")
    if (game.currentPhase >= 999)
      return await message.author.send("The game is over! You can no longer use your actions.")
      
    let target = parseInt(args[0])
    if (isNaN(target) || target > game.players.length || target < 1)
      return await message.author.send("Invalid target.")
      
    let targetPlayer = game.players[target-1]
    if (targetPlayer.roleRevealed)
      return await message.author.send("That player has already been revealed!")
    if (!targetPlayer.alive)
      return await message.author.send("You cannot reveal a dead player's role!")
      
    gamePlayer.selected = targetPlayer.number
      
    return await message.author.send(
      `${fn.getEmoji(client, "Voting")} You selected **${
        targetPlayer.number
      } ${nicknames.get(targetPlayer.id)}** to be revealed when you die.`
    )
      
    QuickGames[index] = game
    
    games.set("quick", QuickGames)
  }
}