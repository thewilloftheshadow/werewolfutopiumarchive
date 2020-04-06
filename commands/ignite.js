const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles")

module.exports = {
  name: "ignite",
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
      return await message.author.send("You do not have the abilities to ignite players.")
    if (!gamePlayer.alive)
      return await message.author.send("You are dead. You can no longer ignite players.")

    if (game.currentPhase % 3 != 0)
      return await message.author.send("You can only ignite players during the night!")
    if (gamePlayer.jailed)
      return await message.author.send("You are currently jailed and cannot use your abilities.")
    if (gamePlayer.nightmared)
      return await message.author.send("You are having a nightmare and cannot use your abilities!")
    if (typeof gamePlayer.usedAbilityTonight == 'array')
      return await message.author.send("You already decided to douse players tonight!")
    if (game.currentPhase >= 999)
      return await message.author.send("The game is over! You can no longer use your actions.")

    let dousedPlayers = gamePlayer.doused.map(p => game.players[p-1]).filter(p => p.alive)

    if (!dousedPlayers.length)
      return await message.author.send("You haven't doused anyone or every doused player is dead! Do `w!douse [player1] [player2]` first!")

    for (var dousedPlayer of dousedPlayers) {
      dousedPlayer.alive = false
      if (game.config.deathReveal) dousedPlayer.roleRevealed = dousedPlayer.role

      fn.broadcastTo(
        client,
        game.players.filter(p => !p.left),
        `${fn.getEmoji(client, "Arsonist_Ignite")} The Arsonist ${fn.getEmoji(client, "Arsonist")} has ignited **${
          dousedPlayer.number
        } ${nicknames.get(dousedPlayer.id)}${
          game.config.deathReveal
            ? ` ${fn.getEmoji(client, dousedPlayer.role)}`
            : ""
        }**.`
      )
      dousedPlayer.killedBy = gamePlayer.number

      game = fn.death(client, game, dousedPlayer.number)
    }
    gamePlayer.killedTonight = true
    gamePlayer.usedAbilityTonight = "ignite"
    gamePlayer.doused = []

    QuickGames[index] = game
    games.set("quick", QuickGames)
  }
} 