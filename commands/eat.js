const Discord = require('discord.js'),
			moment = require('moment'),
      db = require('quick.db') 
          
const games = new db.table("Games"),
			players = new db.table("Players"),
      nicknames = new db.table("Nicknames")
      
const fn = require('/app/util/fn'),
      roles = require("/app/util/roles")


module.exports = {
  name: "eat", 
  gameroles: ["Cannibal"],
  aliases: ["munch"], //lmao this is the best alias ever -shadow
  run: async (client, message, args, shared) => {
    /*
    let player = players.get(message.author.id)
    if (!player.currentGame)
    return await message.author.send("You are not currently in a game!\nDo `w!quick` to join a Quick game.") 


    let QuickGames = games.get("quick"),
        game = QuickGames.find(g => g.gameID == player.currentGame),
        index = QuickGames.indexOf(game),
        gamePlayer = game.players.find(player => player.id == message.author.id)
    if (gamePlayer.role !== "Cannibal")
      return await message.author.send("You do not have the abilities to eat a player.")
    if (!gamePlayer.alive)
      return await message.author.send("You are dead. You can no longer eat a player.")
    if (gamePlayer.jailed)
      return await message.author.send("You are currently jailed and cannot use your abilities.")
    if (game.currentPhase >= 999)
      return await message.author.send("The game is over! You can no longer use your abilities.")
      */
  } 
} 



