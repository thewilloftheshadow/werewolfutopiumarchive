const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles")

module.exports = {
  name: "sect",
  gameroles: ["Sect Leader"],
  run: async (client, message, args, shared) => {
    let player = players.get(message.author.id)
    if (!player.currentGame)
      return await message.author.send(
        "**You are not currently in a game!**\nDo `w!quick` to join a Quick Game!"
      )

    let QuickGames = games.get("quick"),
        game = QuickGames.find(g => g.gameID == player.currentGame),
        index = QuickGames.indexOf(game),
        gamePlayer = game.players.find(player => player.id == message.author.id)

    if (gamePlayer.role !== "Sect Leader")
      return await message.author.send("Only the Sect Leader can turn a player into the sect!")
    if (!gamePlayer.alive)
      return await message.author.send("You are dead. You can no longer sect players.")

    if (game.currentPhase % 3 !== 0)
      return await message.author.send("You can only sect a player during the night!")
    if (gamePlayer.jailed)
      return await message.author.send("You cannot sect other players while in jail!")
    if (gamePlayer.nightmared)
      return await message.author.send("You are having a nightmare and cannot use your abilities!")
    if (game.currentPhase >= 999)
      return await message.author.send("The game is over! You can no longer use your actions.")

    let target = parseInt(args[0])
    if (isNaN(target) || target > game.players.length || target < 1)
      return await message.author.send("Invalid target.")

    let targetPlayer = game.players[target - 1]
    if (!targetPlayer.alive)
      return await message.author.send("You cannot sect a dead player!")
    if (targetPlayer.number == gamePlayer.number)
      return await message.react(fn.getEmoji(client, "harold"))
    if (targetPlayer.sect)
      return await message.author.send("This player is already in the sect!")
    
    if (targetPlayer.role == "President")
      return await message.author.send("You cannot sect the president!")
    
    gamePlayer.killedTonight = true
    gamePlayer.usedAbilityTonight = targetPlayer.number
    
    message.author.send(
      `${fn.getEmoji(client, "Sect_Member")} You selected **${targetPlayer.number} ${
      nicknames.get(targetPlayer.id)}** to be turned into your sect!`
    )
    
    fn.addLog(
      game,
      `[ACTION] ${gamePlayer.role} ${gamePlayer.number} ${nicknames.get(gamePlayer.id)} selected ${
      targetPlayer.number} ${nicknames.get(targetPlayer.id)} (${targetPlayer.role}) to be turned into their sect.`
    )
    
    QuickGames[index] = game

    games.set("quick", QuickGames)
  }
}