const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles")

module.exports = {
  name: "kill",
  gameroles: ["Illusionist", "Marksman"],
  run: async (client, message, args, shared) => {
    let player = players.get(message.author.id)
    if (!player.currentGame)
      return await message.author.send("**You are not currently in a game!**\nDo `w!quick` to join a Quick game.")

    let QuickGames = games.get("quick"),
        game = QuickGames.find(g => g.gameID == player.currentGame),
        index = QuickGames.indexOf(game),
        gamePlayer = game.players.find(player => player.id == message.author.id)
    if (!gamePlayer.alive)
      return await message.author.send("You are dead. You can no longer use your abilities.")
    if (gamePlayer.jailed)
      return await message.author.send("You are currently jailed and cannot use your abilities.")
    if (game.currentPhase >= 999)
      return await message.author.send("The game is over! You can no longer use your abilities.")

    if (gamePlayer.role === "Illusionist"){
    if (game.currentPhase % 3 != 1)
      return await message.author.send("You can only kill disguised players during the discussion phase!")

    let disguised = game.players.filter(
      p => p.alive && gamePlayer.deluded.includes(p.number)
    )

    if (!disguised.length)
      return await message.author.send("You haven't disguised anyone or every disguised player is dead! Do `w!disguise [player1] [player2]` first!")

    for (var target of disguised) {
      target.alive = false
      if (game.config.deathReveal) target.roleRevealed = target.role

      fn.broadcastTo(
        client,
        game.players.filter(p => !p.left),
        `${fn.getEmoji(client, "Illusionist_Kill")} The Illusionist ${fn.getEmoji(client, "Illusionist")} has killed **${target.number
        } ${nicknames.get(target.id)}${
          game.config.deathReveal
            ? ` ${fn.getEmoji(client, target.role)}`
            : ""
        }**.`
      )
    }
    
    fn.addLog(
      game,
      `[ACTION] ${gamePlayer.role} ${gamePlayer.number} ${nicknames.get(
        gamePlayer.id
      )} has killed the disguised ${disguised.map(x => `${x.number} ${nicknames.get(x.id)} (${x.role})`).join(", ")}.`
    )
    
    game = fn.death(client, game, disguised.map(x => x.number))
    } else if(gamePlayer.role === "Marksman") {
      if(game.currentPhase == 0) return await message.author.send("You can only mark a player on the first night!")
      
      let target = gamePlayer.target
      if(!target) return await message.author.send("Please use `w!mark` to mark a player first.")
      
      if ((gamePlayer.tgtAct||999) > game.currentPhase)
        return await message.author.send("You can only shoot your arrow next night or after!")
      
      let targetPlayer = game.players[target-1]
      if(targetPlayer.team == "Village"){
        gamePlayer.alive = false
        if (game.config.deathReveal) gamePlayer.roleRevealed = gamePlayer.role
        
          fn.broadcastTo(
            client, game.players.filter(p => !p.left).map(p => p.id), 
            `${fn.getEmoji(client, "Marksman_Shoot")} Marksman **${gamePlayer.number} ${nicknames.get(message.author.id)}** tried to shoot **${target} ${nicknames.get(targetPlayer.id)}${game.config.deathReveal ? ` ${fn.getEmoji(client, targetPlayer.role)}` : ""}**, but their shot backfired and killed themself!`)
          gamePlayer.roleRevealed = gamePlayer.role
        
        
        fn.addLog(
          game,
          `[ACTION] ${gamePlayer.role} ${gamePlayer.number} ${nicknames.get(gamePlayer.id)} tried to shoot ${
          targetPlayer.number} ${nicknames.get(targetPlayer.id)} (${targetPlayer.role}), but the shot backfired and killed themself instead!.`
        )
        game = fn.death(client, game, gamePlayer.number)   
      } else {
        targetPlayer.alive = false
        if (game.config.deathReveal) targetPlayer.roleRevealed = targetPlayer.role
        
        fn.broadcastTo(
          client, game.players.filter(p => !p.left).map(p => p.id), 
          `${fn.getEmoji(client, "Marksman_Shoot")} Marksman **${gamePlayer.number} ${nicknames.get(message.author.id)}** shot **${target} ${nicknames.get(targetPlayer.id)}${game.config.deathReveal ? ` ${fn.getEmoji(client, targetPlayer.role)}` : ""}**.`)
        gamePlayer.roleRevealed = gamePlayer.role
        
        fn.addLog(
          game,
          `[ACTION] ${gamePlayer.role} ${gamePlayer.number} ${nicknames.get(gamePlayer.id)} shot ${
          targetPlayer.number} ${nicknames.get(targetPlayer.id)} (${targetPlayer.role}).`
        )
        game = fn.death(client, game, targetPlayer.number)   
      }
        
      gamePlayer.abil1 -= 1
      game.lastDeath = game.currentPhase
      delete gamePlayer.target
      delete gamePlayer.tgtAct
    } else return await message.author.send("You do not have the abilities to kill players.")

    QuickGames[index] = game
    games.set("quick", QuickGames)
  }
} 