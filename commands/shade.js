const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles")

module.exports = {
  name: "shade",
  gameroles: ["Shadow Wolf"],
  run: async (client, message, args, shared) => {
    let player = players.get(message.author.id)
    if (!player.currentGame) 
      return await message.author.send("**You are not currently in a game!**\nDo `w!quick` to join a Quick Game!")
    
    let QuickGames = games.get("quick"),
        game = QuickGames.find(g => g.gameID == player.currentGame),
        index = QuickGames.indexOf(game),
        gamePlayer = game.players.find(player => player.id == message.author.id)
    
    if (gamePlayer.role !== "Werewolf Berserk")
      return await message.author.send("You do not have the abilities to activate shady voting.")
    if (!gamePlayer.alive)
      return await message.author.send("You are dead. You can no longer activate shady voting.")
    if (!gamePlayer.abil1)
      return await message.author.send("You have activated shady voting already.")
    if (gamePlayer.jailed)
      return await message.author.send("You are currently jailed and cannot use your abilities.")
    if (game.currentPhase >= 999)
      return await message.author.send("The game is over! You can no longer use your actions.")
    
    if (game.currentPhase % 3 == 0)
      return await message.author.send("You can only activate shady voting at day!")
        
    game.shade = true
    
    message.author.send(
      "You have activated shady voting for today!"
    )
    
    gamePlayer.abil1 -= 1
    
    QuickGames[index] = game
    
    games.set("quick", QuickGames)
  }
}