const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles")

const quickGameRoles = [
  ["Doctor", "Seer", "Pacifist", "Wolf Seer", "Mayor", "Alpha Werewolf", "Gunner", Math.random() < 0.5 ? "Fool" : "Headhunter",
   "Bodyguard", "Gunner", "Wolf Shaman", "Aura Seer", "Serial Killer", "Cursed", "Wolf Seer", "Priest"],
  ["Aura Seer", "Medium", "Jailer", "Werewolf", "Doctor", "Alpha Werewolf", "Seer", Math.random() < 0.5 ? "Fool" : "Headhunter",
   "Bodyguard", "Gunner", "Wolf Shaman", "Cursed", "Serial Killer", "Mayor", "Wolf Seer", "Avenger"],
]

module.exports = {
  name: "sandbox",
  aliases: ["sb"],
  run: async (client, message, args, shared) => {
    return message.author.send("Sandbox games aren't avaliable to play yet!")
    if (!games.get("count")) games.set("count", 0)
    if (!games.get("quick")) games.set("quick", [])
    let Games = games.get("quick")
    
    if (Games.find(g => g.gameID == players.get(`${message.author.id}.currentGame`))) {
      let prevGame = Games.find(g => g.gameID == players.get(`${message.author.id}.currentGame`)),
          prevGamePlayer = prevGame.players.find(p => p.id == message.author.id)
      if (prevGame.currentPhase < 999 && !prevGamePlayer.left)
        return await message.author.send("You are already in a game!")
      else prevGamePlayer.left = true
    }
    
    let currentGame = Games.find(game => game.players.length <= 16 && game.currentPhase < -0.5 && game.mode == "sandbox")
    if (currentGame) {
      Games[Games.indexOf(currentGame)].players.push({ id: message.author.id, lastAction: moment() })
      currentGame = Games.find(game => game.gameID == currentGame.gameID)
    } else {
      currentGame = {
        mode: "sandbox",
        gameID: games.add("count", 1),
        nextPhase: null,
        currentPhase: -1,
        originalRoles: quickGameRoles[Math.floor(Math.random()*quickGameRoles.length)],
        players: [{
          id: message.author.id,
          lastAction: moment()
        }],
        logs: "",
        logMsgs: [],
        spectators: [],
        config: {
          deathReveal: true,
          talismans: true
        }
      }
      Games.push(currentGame)
    }
    
    let m = message.author.send(
      new Discord.MessageEmbed()
        .setAuthor(`You have joined Game #${currentGame.gameID}.`, message.author.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 }))
        .addField(`Current Players [${currentGame.players.length}]`, currentGame.players.map(player => nicknames.get(player.id)).join("\n"))
    ).catch(async error => {
      await message.channel.send("**I cannot DM you!**\nPlease make sure you enabled Direct Messages on at least one server the bot is on.")
      return undefined
    })
    if (!m) return undefined
    
    let m2 = message.author.send(
      new Discord.MessageEmbed().setTitle("Welcome to the game! Here are some useful commands to get started:")
      .setDescription(`\`w!start\` - Vote to start the game (4 people required)\n\`w!game\` - See the player list and the list of roles in the game\n\`w!leave\` - Leave the game. **Warning: Doing this after the game starts is considered suiciding**`)
    )
    
    fn.broadcastTo(
      client, currentGame.players.filter(p => p.id !== message.author.id),
      new Discord.MessageEmbed()
        .setAuthor(`${nicknames.get(message.author.id).replace(/\\_/g, "_")} joined the game.`, message.author.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 }))         
        .addField(`Current Players [${currentGame.players.length}]`, currentGame.players.map(player => nicknames.get(player.id)).join("\n"))
    )
    fn.addLog(currentGame, `${nicknames.get(message.author.id)} joined the game.`)
    
    games.set("quick", Games)
    players.set(`${message.author.id}.currentGame`, currentGame.gameID)
      
    if (currentGame.players.length == 16) require('/app/process/start')(client, currentGame)
  }
}