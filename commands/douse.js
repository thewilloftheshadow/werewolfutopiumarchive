const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles")

module.exports = {
  name: 'douse',
  gameroles: ["Arsonist"],
  run: async (client, message, args, shared) => {
		let player = players.get(message.author.id)
    if (!player.currentGame)
    return await message.author.send("**You are not currently in a game!**\nDo `w!quick` to join a Quick game.")
    
    let QuickGames = games.get("quick"),
        game = QuickGames.find(g => g.gameID == player.currentGame),
        index = QuickGames.indexOf(game),
        gamePlayer = game.players.find(player => player.id == message.author.id)
    
    if (gamePlayer.role != "Arsonist")
      return await message.author.send("You do not have the abilities to douse a player.")
    if (!gamePlayer.alive)
      return await message.author.send("You are dead. You can no longer douse a player.")
    
    if (game.currentPhase % 3 != 0)
      return await message.author.send("You can only douse players during the night!")
    if (gamePlayer.jailed)
      return await message.author.send("You are currently jailed and cannot use your abilities.")
    if (gamePlayer.nightmared)
      return await message.author.send("You are having a nightmare and cannot use your abilities!")
    if (gamePlayer.usedAbilityTonight == "ignite")
      return await message.author.send("You already ignited doused players tonight!")
    if (game.currentPhase >= 999)
      return await message.author.send("The game is over! You can no longer use your actions.")
    
    let targetA = parseInt(args[0]),
        targetB = parseInt(args[1])
    if (isNaN(targetA) || targetA > game.players.length || targetA < 1 ||
       isNaN(targetB) || targetB > game.players.length || targetB < 1)
      return await message.author.send("Invalid target.")
    if (!game.players[targetA-1].alive || !game.players[targetB-1].alive)
      return await message.author.send("You cannot douse dead players!")
    if (targetA == targetB) 
      return await message.author.send("You need to select **__two different targets__** for our ability to work!")
    if (targetA == gamePlayer.number || targetB == gamePlayer.number)
      return await message.react(fn.getEmoji(client, "harold"))
    
    let targetPlayerA = game.players[targetA-1],
        targetPlayerB = game.players[targetB-1]
    
    if ((gamePlayer.doused || []).includes(targetPlayerA.number))
      return await message.author.send(`You doused **${game.players[targetA-1]} ${nicknames.get(game.players[targetA-1])}** already!`) 
    if ((gamePlayer.doused || []).includes(targetPlayerB.number))
      return await message.author.send(`You doused **${game.players[targetB-1]} ${nicknames.get(game.players[targetB-1])}** already!`)
    
    if (targetPlayerA.role == "President" || targetPlayerB.role == "President")
      return await message.author.send("You cannot douse the President!")
    
    message.author.send(
    	new Discord.MessageEmbed()
        .setTitle(`Doused Players`)
        .setThumbnail(fn.getEmoji(client, "Arsonist Doused").url)
        .setDescription(
          `You have doused **${targetA} ${nicknames.get(targetPlayerA.id)}** and **${targetB} ${nicknames.get(targetPlayerB.id)}**!`
        )
    )
    
    gamePlayer.usedAbilityTonight = [targetA, targetB]

    
    QuickGames[index] = game
    games.set("quick", QuickGames)
  }
} 