const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require("/app/util/fn"),
      roles = require('/app/util/roles')

module.exports = async (client, game) => { try {
  let Games = games.get("quick")
  
  fn.broadcast(client, game, "Game is starting...")
  game.currentPhase = -.5

  let thisGame1 = Games.find(g => g.gameID == game.gameID)
  Games[Games.indexOf(thisGame1)] = game
  
  games.set("quick", Games)
    
  game.originalRoles.splice(game.players.length)
  let gameRoles = fn.clone(game.originalRoles)
  
  for (var i = 0; i < game.players.length; i++) {
    game.players[i].number = i+1
    let thisPlayer = game.players[i]
    let role = thisPlayer.role = gameRoles.splice(Math.floor(Math.random() * (game.players.length-i)), 1)[0]
    Object.assign(game.players[i], {alive: true, protectors: []})
    
    if (thisPlayer.role.includes("Random")) {
      let rdmRoles = Object.values(roles).filter(
        role =>
          ((thisPlayer.role == "Random" && role.cat !== "Random") || thisPlayer.role == `Random ${role.cat}`) && 
            !(game.originalRoles.includes(role.name) && role.oneOnly)
      )
      
      role = thisPlayer.initialRole = thisPlayer.role = rdmRoles[thisPlayer.role][Math.floor(Math.random()*rdmRoles[thisPlayer.role].length)]
    }
      
    switch (thisPlayer.role) {
      case "Bodyguard":
        thisPlayer.health = 2; break;
      case "Tough Guy":
        thisPlayer.health = 1; break;
      case "Medium": case "Jailer": case "Priest": case "Flower Child": 
      case "Werewolf Berserk": case "Kitten Wolf": case "Guardian Wolf":
        thisPlayer.abil1 = 1; break;
      case "Gunner": case "Marksman":
      case "Nightmare Werewolf":
        thisPlayer.abil1 = 2; break;
      case "Fortune Teller":
        thisPlayer.cards = []; break;
      case "Sect Leader":
        thisPlayer.sect = true; break;
      case "Illusionist":
        thisPlayer.deluded = []; break;
      case "Soul Collector":
        thisPlayer.box = []; break;
      case "Witch":
        thisPlayer.abil1 = 1; thisPlayer.abil2 = 1; break;
    }
    
    await fn.getUser(client, thisPlayer.id).send(
      new Discord.MessageEmbed()
        .setTitle(
          `You are Player #${thisPlayer.number}.`
        )
    )
    
    await fn.getUser(client, thisPlayer.id).send(
      new Discord.MessageEmbed()
        .setThumbnail(fn.getEmoji(client, thisPlayer.role).url)
        .setTitle(
          `You are ${
            roles[role].oneOnly
              ? "the"
              : /^([aeiou])/i.test(role)
              ? "an"
              : "a"
          } ${role}.`
        )
        .setDescription(
          `${roles[role].desc}\n\nAura: ${roles[role].aura}\nTeam: ${roles[role].team}`
        )
    )
  }
  
  game.roles = game.players.map(p => p.role)
  game.lastDeath = 0
  game.currentPhase = 0
  game.nextPhase = moment().add(30, "s")
  
  let headhunters = game.players.filter(p => p.role == "Headhunter")
  for (var i = 0; i < headhunters.length; i++) {
    let possibleTargets = game.players
      .filter(p => 
        roles[p.role].team.includes("Village") && 
        !["Gunner", "Priest", "Mayor", "Cursed"].includes(p.role) && 
        p.number !== headhunters[i].number &&
        !p.headhunter
      ).map(p => p.number)
    if (!possibleTargets.length) 
      possibleTargets = game.players.filter(p => !p.headhunter).map(p => p.number)
    let target = possibleTargets[Math.floor(Math.random()*possibleTargets.length)]
    game.players[target-1].headhunter = headhunters[i].number
    await fn.getUser(client, headhunters[i].id)
      .send(
        new Discord.MessageEmbed()
          .setAuthor(`Target`, fn.getEmoji(client, "Headhunter Target").url)
          .setDescription(`Your target is ${target} ${client.users.get(game.players[target-1].id).username}.`)
      )
  }
  
  for (var i = 0; i < game.players.length; i++) {
    let thisPlayer = game.players[i]
    
    fn.getUser(client, thisPlayer.id).send(
      new Discord.MessageEmbed()
        .setTitle(game.mode == 'custom' ? game.name : `Game #${game.gameID}`)
        .addField(
          `Players [${game.players.length}]`,
          game.currentPhase == -1
            ? game.players.map(p => nicknames.get(p.id)).join("\n")
            : game.players.map(
                p =>
                  `${p.id == thisPlayer.id ? "**" : ""}${
                    p.number
                  } ${nicknames.get(p.id)}${
                    p.alive ? "" : " <:Death:668750728650555402>"
                  }${
                    p.id == thisPlayer.id ||
                    p.roleRevealed
                      ? ` ${fn.getEmoji(client, p.roleRevealed || p.role)}`
                      : roles[thisPlayer.role].team == "Werewolves" &&
                        roles[p.role].team == "Werewolves"
                      ? ` ${fn.getEmoji(client, p.role)}`
                      : ""
                  }${p.left ? " *off*" : ""}${
                    p.id == thisPlayer.id ? "**" : ""
                  }`
              ).join("\n")
        )
        .addField(
          `Roles`,
          game.originalRoles
            .sort((a, b) => {
              if (a > b) return 1
              if (a < b) return -1
            })
            .map(r => `${fn.getEmoji(client, r)} ${r}`)
            .join("\n")
        )
    )
    
    fn.getUser(client, thisPlayer.id).send(
      new Discord.MessageEmbed()
        .setTitle("Night 1 has started.")
        .setThumbnail(fn.getEmoji(client, "Night").url)
        .setDescription(
          roles[thisPlayer.role].nit1 || roles[thisPlayer.role].nite || "Nothing to do. Go back to sleep!"
        )
    )
  }
  
  // await fn.broadcastTo(
  //   client, game.players.filter(p => !p.left),
  //   new Discord.MessageEmbed()
  //     .setTitle("Night 1 has started.")
  //     .setThumbnail(fn.getEmoji(client, "Night").url)
  // )
  
  if (game.roles.includes("President")) {
    let president = game.players.find(p => p.role == "President")
    
    await fn.broadcastTo(
      client, game.players.filter(p => !p.left),
      new Discord.MessageEmbed()
        .setTitle("President")
        .setThumbnail(fn.getEmoji(client, "President"))
        .setDescription(`**${president.number} ${fn.getUser(client, president.id).username}** is the President!`)
    )
    
    president.roleRevealed = "President"
  }
  
  game.startTime = moment()
  
  let thisGame = Games.find(g => g.gameID == game.gameID)
  Games[Games.indexOf(thisGame)] = game
  
  games.set("quick", Games)
} catch (error) {
  client.channels.cache.get("664285087839420416").send(
    new Discord.MessageEmbed()
      .setColor("RED")
      .setTitle(`${fn.getEmoji(client, "red_tick")} Game Terminated`)
      .setDescription(
        `${
          game.mode == "custom"
            ? `${game.name} [\`${game.gameID}\`]`
            : `Game #${game.gameID}`
        } has been terminated when trying to \`start the game\` due to the following reason: \`\`\`${
          error.stack.replace(/(?:(?!\n.*?\(\/app.*?)\n.*?\(\/.*?\))+/g, "\n\t...")
        }\`\`\``
      )
  )
  
  game.currentPhase = 999
  // fn.addXP(game.players, 15)
  fn.addXP(game.players.filter(p => !p.left), 15)
  fn.broadcastTo(
    client, game.players.filter(p => !p.left),
    `${fn.getEmoji(client, "red_tick")} There is an error causing this game to be terminated.` +
    " Please contact staff members."
  )
}}