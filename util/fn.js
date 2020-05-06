const Discord = require("discord.js")
const moment = require("moment")
const Canvas = require("canvas")
const fs = require("fs")

const db = require("quick.db"),
      games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames"),
      logs = new db.table("Logs")

const { defaultPrefix, embedColor } = require('./config'),
      roles = require('./roles')

let time = (date = moment()) => {
  return moment(date).utcOffset(8).format("YYYY/MM/DD HH:mm:ss")
}

let utcTime = (date = moment()) => {
  return moment(date).format("YYYY/MM/DD HH:mm:ss [GMT]")
}

let ago = (date = moment()) => {
  return moment(date).fromNow()
}

let embed = (client, content) => {
  if (content instanceof Object) {
    let { title, description } = content
    return new Discord.MessageEmbed()
      .setColor(embedColor)
      .setTitle(title)
      .setDescription(description)
      .setFooter(client.user.username, client.user.avatarURL)
      .setTimestamp()
  } else if (typeof content == "string") {
    return new Discord.MessageEmbed()
      .setColor(embedColor)
      .setDescription(content)
      .setFooter(client.user.username, client.user.avatarURL)
      .setTimestamp()
  } else {
    throw Error('Invalid content type.\nAccepts Object or String.')
  }
  return undefined
}

let error = (client, message, error) => {
  return new Discord.MessageEmbed()
    .setColor(embedColor)
    .setTitle(message)
    .setDescription(`${error}`)
    .setFooter(client.user.username, client.user.avatarURL)
    .setTimestamp()
}

let getUser = (client, data) => {
  if (data instanceof Discord.User) return data
  if (data instanceof Discord.GuildMember) return data.user
  if (data instanceof Discord.Message) return data.author
  if (typeof data == "string") return client.users.cache.find(user => user.id == data || user.tag.toLowerCase() == data.toLowerCase())
  // throw Error('Cannot find user.')
}

let getMember = (guild, data) => {
  if (data instanceof Discord.User) return guild.members.get(data.id)
  if (data instanceof Discord.GuildMember) return data
  if (data instanceof Discord.Message) return data.member
  if (typeof data == "string") return guild.members.cache.find(member => member.user.id == data || member.user.tag.toLowerCase() == data.toLowerCase())
  // throw Error('Cannot find member.')
}

let getRole = (guild, data) => {
  if (data instanceof Discord.Role) return data
  if (typeof data == "string") return guild.roles.cache.find(role => role.name.toLowerCase() == data.toLowerCase() || role.id == data || role.name.toLowerCase().startsWith(data.toLowerCase()))
  // throw Error('Cannot find role.')
}

let getEmoji = (client, name) => {
  return client.emojis.cache.find(emoji => emoji.name.toLowerCase() == name.toLowerCase().replace(/ /g, "_"))
}

let paginator = async (author, msg, embeds, pageNow, addReactions = true) => {
  if(embeds.length === 1) return
  if (addReactions) {
    await msg.react("⏪")
    await msg.react("◀")
    await msg.react("▶")
    await msg.react("⏩")
  }
  let reaction = await msg.awaitReactions((reaction, user) => user.id == author && ["◀","▶","⏪","⏩"].includes(reaction.emoji.name), {time: 30*1000, max:1, errors: ['time']}).catch(() => {})
  if (!reaction) return msg.reactions.removeAll().catch(() => {})
  reaction = reaction.first()
  //console.log(msg.member.users.tag)
  if (msg.channel.type == 'dm' || !msg.guild.me.hasPermission("MANAGE_MESSAGES")) {
    if (reaction.emoji.name == "◀") {
      let m = await msg.channel.send(embeds[Math.max(pageNow-1, 0)])
      msg.delete()
      paginator(author, m, embeds, Math.max(pageNow-1, 0))
    } else if (reaction.emoji.name == "▶") {
      let m = await msg.channel.send(embeds[Math.min(pageNow+1, embeds.length-1)])
      msg.delete()
      paginator(author, m, embeds, Math.min(pageNow+1, embeds.length-1))
    } else if (reaction.emoji.name == "⏪") {
      let m = await msg.channel.send(embeds[0])
      msg.delete()
      paginator(author, m, embeds, 0)
    } else if (reaction.emoji.name == "⏩") {
      let m = await msg.channel.send(embeds[embeds.length-1])
      msg.delete()
      paginator(author, m, embeds, embeds.length-1)
    }
  }
  else {
    if (reaction.emoji.name == "◀") {
      await reaction.users.remove(author)
      let m = await msg.edit(embeds[Math.max(pageNow-1, 0)])
      paginator(author, m, embeds, Math.max(pageNow-1, 0), false)
    } else if (reaction.emoji.name == "▶") {
      await reaction.users.remove(author)
      let m = await msg.edit(embeds[Math.min(pageNow+1, embeds.length-1)])
      paginator(author, m, embeds, Math.min(pageNow+1, embeds.length-1), false)
    } else if (reaction.emoji.name == "⏪") {
      await reaction.users.remove(author)
      let m = await msg.edit(embeds[0])
      paginator(author, m, embeds, 0, false)
    } else if (reaction.emoji.name == "⏩") {
      await reaction.users.remove(author)
      let m = await msg.edit(embeds[embeds.length-1])
      paginator(author, m, embeds, embeds.length-1, false)
    }
  }
}

const deepClone = (object) => {
  return JSON.parse(JSON.stringify(object))
}

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}


const broadcast = async (client, game, content, ignore = []) => {
  for (var player of game.players) 
    if (!ignore.includes(player.id))
      await client.users.cache.get(player.id).send(
        typeof content == "string" && content.match(new RegExp(`\\b${player.number}\\b`, "gi")) ?
          `> ${content}` : content
      ).catch(() => {})
}

const broadcastTo = (client, users, content) => {
  if (typeof users[0] !== "string") users = users.map(x => x.id)
  
  let game = games.get("quick").find(g => g.gameID == players.get(`${users[0]}.currentGame`))
  // if (game.currentPhase % 3 !== 0) users.push(...game.spectators)
  
  for (var user of users) 
    getUser(client, user).send(
      typeof content == "string" && content.match(new RegExp(`(?<!Night |Day )\\b${game.players.find(p => p.id == user).number}\\b`, "gi")) ?
        `> ${content}` : content
    ).catch(() => {})
  
  // client.channels.get("677694502915276831").send()
}

const addXP = (game, users, xp) => {
  if (game.mode == 'custom' && moment(game.startTime).add(6, 'm') > moment())
    return undefined;
  if (typeof users[0] !== "string") users = users.map(x => x.id)
  for (var i = 0; i < users.length; i++)
    players.add(`${users[i]}.xp`, xp)
}

const addWin = (game, winners, team) => {
  if (game.mode == 'custom') return undefined
  
  for (var i = 0; i < game.players.length; i++) {
    if (game.players[i].suicide) continue;
    if (winners.includes(game.players[i].number))
      players.push(`${game.players[i].id}.wins`, {
        role: game.players[i].role,
        team: team ? team : 
              game.players[i].sect ? "Sect" : roles[game.players[i].role].team
      })
    else 
      players.push(`${game.players[i].id}.loses`, {
        role: game.players[i].role,
        team:
          game.players[i].role == "Headhunter" &&
          game.players.find(
            p => p.alive && p.headhunter == game.players[i].number
          )
            ? "Solo"
            : game.players[i].sect
            ? "Sect"
            : roles[game.players[i].role].team
      })
  }
}

const gameEmbed = (client, game) => {
  return new Discord.MessageEmbed()
    .setTitle(
      game.mode == "custom"
        ? `${game.name} [\`${game.gameID}\`]`
        : `Game #${game.gameID}`
    )
    .addField(
      `Players [${game.players.length}]`,
      !game.players.length
        ? "-"
        : game.currentPhase == -1
        ? game.players.map(p => nicknames.get(p.id)).join("\n")
        : game.players
            .map(
              p =>
                `${p.number} ${nicknames.get(p.id)}${
                  p.alive ? "" : " <:Death:668750728650555402>"
                } ${
                  p.initialRole && p.initialRole !== p.role
                    ? `${getEmoji(client, p.initialRole)} ➨ `
                    : ""
                }${getEmoji(client, p.role)}${
                  p.couple ? ` ${getEmoji(client, "Cupid Lovers")}` : ""
                }${
                  p.sect && p.role !== "Sect Leader"
                    ? ` ${getEmoji(client, "Sect Member")}`
                    : ""
                }${
                  p.boxed &&
                  game.players.find(
                    pl => pl.role == "Soul Collector" && pl.alive
                  )
                    ? ` ${getEmoji(client, "Soul")}`
                    : ""
                }${p.left ? " *off*" : ""}`
            )
            .join("\n")
    )
    .addField(
      "Roles",
      game.originalRoles.map(r => `${getEmoji(client, r)}`).join(" ")
    )
}

const death = (client, game, killed, suicide = false) => {
  // console.log(killed)
  if (killed == []) return game
  let deadPlayers
  if (killed instanceof Array) deadPlayers = game.players.filter(p => killed.includes(p.number))
  else deadPlayers = [game.players.find(p => p.number == killed)]
  // console.log(deadPlayers)
  
  for (var deadPlayer of deadPlayers) {
    if (suicide !== "corr"){
      // DOPPEL TAKE ROLE
      game.running = "doppelganger taking new role"
      let doppels = game.players.filter(p => p.alive && p.role == "Doppelganger" && p.selected == deadPlayer.number)
      for (var doppel of doppels) {
        let gamePlayer = deepClone(deadPlayer);
        ['number','id','headhunter','lastAction','roleRevealed','initialRole','alive'].forEach( x => delete gamePlayer[x])
        doppel = Object.assign(doppel, gamePlayer)
        getUser(client, doppel.id).send(
          new Discord.MessageEmbed()
            .setTitle("Welp.")
            .setThumbnail(getEmoji(client, deadPlayer.role).url)
            .setDescription(
              `**${deadPlayer.number} ${nicknames.get(deadPlayer.id)} ${getEmoji(
                client,
                deadPlayer.role
              )}** has died and you have taken their role. You are now a${[
                "A",
                "E",
                "I",
                "O",
                "U"
              ].includes(deadPlayer.role[0])} ${deadPlayer.role}!`
            )
        )
        
        addLog(
          game,
          `Doppelganger ${
            doppel.number
          } ${nicknames.get(doppel.id)} inherited the role and abilities of ${
            deadPlayer.number
          } ${nicknames.get(deadPlayer.id)} (${deadPlayer.role}) as they died.`
        )
      }
    }

    game.running = "start death module"

    if (!suicide || suicide == "corr") {
      // LOUDMOUTH REVEAL
      game.running = "loudmouth reveal"
      if (deadPlayer.role == "Loudmouth" && deadPlayer.selected) {
        let revealedPlayer = game.players[deadPlayer.selected-1]
          if (revealedPlayer.alive) {
          broadcastTo(
            client,
            game.players.filter(p => !p.left),
            new Discord.MessageEmbed()
              .setTitle("Last Will")
              .setThumbnail(getEmoji(client, "Loudmouth").url)
              .setDescription(
                `The Loudmouth's last will was to reveal **${
                  revealedPlayer.number
                } ${nicknames.get(
                  revealedPlayer.id
                )}**. They are ${
                      roles[revealedPlayer.role].oneOnly
                        ? "the"
                        : /^([aeiou])/i.test(revealedPlayer.role)
                        ? "an"
                        : "a"
                    } ${getEmoji(
                  client,
                  revealedPlayer.role
                )} ${revealedPlayer.role}.`
              )
          )
          revealedPlayer.roleRevealed = revealedPlayer.role
          
          addLog(
            game,
            `The last will of Loudmouth ${
              deadPlayer.number
            } ${nicknames.get(deadPlayer.id)} was to reveal ${
              revealedPlayer.number
            } ${nicknames.get(revealedPlayer.id)} (${revealedPlayer.role}).`
          )
        }
      }

//       if (game.currentPhase % 3 == 1) {
//         // RED LADY VISITING ATTACKED PLAYER
//         game.running = "kill red lady visiting attacked player"
//         let rls = game.players.filter(p => p.alive && p.role == "Red Lady" && p.usedAbilityTonight == deadPlayer.number)
//         for (var rl of rls) {
//           rl.visitedEvil = true
// //           rl.alive = false
// //           rl.roleRevealed = "Red Lady"
// //           rl.killedBy = game.players[rl.usedAbilityTonight-1].number
// //           game.lastDeath = game.currentPhase - 1
// //           game = death(client, game, rl.number)

// //           broadcastTo(
// //             client, game.players.filter(p => !p.left),
// //             `<:Red_Lady_LoveLetter:674854554369785857> **${rl.number} ${nicknames.get(rl.id)} ${getEmoji(client, "Red Lady")
// //             }** visited an evil player and died!`
// //           )
//         }
//       }

      // AVENGING
      game.running = "avenge for junior werewolf and avenger"
      if (!deadPlayer.alive && ["Junior Werewolf","Avenger"].includes(deadPlayer.role)
          && !deadPlayer.avenged && !deadPlayer.suicide) {
        let avengingPlayer = deadPlayer
        let avengedPlayer = game.players[avengingPlayer.avenge-1]
        if (avengedPlayer && avengedPlayer.alive) {
          avengedPlayer.alive = false
          if (game.config.deathReveal) avengedPlayer.roleRevealed = avengedPlayer.role
          avengedPlayer.killedBy = deadPlayer.number

          broadcastTo(
            client,
            game.players.filter(p => !p.left),
            `${getEmoji(
              client,
              `${avengingPlayer.role} Select`
            )} The ${avengingPlayer.role.toLowerCase()}'s death has been avenged, **${
              avengedPlayer.number
            } ${nicknames.get(avengedPlayer.id)}${
              game.config.deathReveal
                ? ` ${getEmoji(client, avengedPlayer.role)}`
                : ""
            }** is dead!`
          )
          
          addLog(
            game,
            `The death of ${deadPlayer.role} ${
              deadPlayer.number
            } ${nicknames.get(deadPlayer.id)} was avenged on ${
              avengedPlayer.number
            } ${nicknames.get(avengedPlayer.id)} (${avengedPlayer.role}).`
          )

          game = death(client, game, avengedPlayer.number)
        }
      }

      // LOVE COUPLE SUICIDE
      game.running = "avenge for love couple"
      if (!deadPlayer.alive && !deadPlayer.suicide && deadPlayer.lover) {
        let otherLover = game.players.find(p => p.number !== deadPlayer.number && p.lover)

        if (otherLover.alive) {
          otherLover.alive = false
          if (game.config.deathReveal) otherLover.roleRevealed = otherLover.role

          broadcastTo(
            client,
            game.players.filter(p => !p.left),
            `${getEmoji(
              client, `Cupid Lovers`
            )} **${
              otherLover.number
            } ${nicknames.get(otherLover.id)}${
              game.config.deathReveal
                ? ` ${getEmoji(client, otherLover.role)}`
                : ""
            }** lost the love of their life and has suicided!`
          )
          
          addLog(
            game,
            `${otherLover.role} ${otherLover.number} ${nicknames.get(otherLover.id)} lost their love of their life and suicided.`
          )

          game = death(client, game, otherLover.number)
        }
      }

      // SECT SUICIDE
      game.running = "suicide for sect"
      if (!deadPlayer.alive && !deadPlayer.suicide && deadPlayer.role == "Sect Leader" && !deadPlayer.sectSuicided &&
          !game.players.find(p => p.role == "Sect Leader" && p.alive)) {
        let sectLeader = game.players.find(p => p.role == "Sect Leader")
        let sectMembers = game.players.filter(p => p.alive & p.sect)

        sectLeader.sectSuicided = true

        for (var sectMember of sectMembers) {
          sectMember.alive = false
          if (game.config.deathReveal) sectMember.roleRevealed = sectMember.role

          broadcastTo(
            client,
            game.players.filter(p => !p.left),
            `${getEmoji(
              client, `Sect Member`
            )} Sect Member **${
              sectMember.number
            } ${nicknames.get(sectMember.id)}${
              game.config.deathReveal
                ? ` ${getEmoji(client, sectMember.role)}`
                : ""
            }** committed suicide!`
          )

        }
        game = death(client, game, sectMembers.map(p => p.number))
        addLog(
          game,
          `Sect Members ${sectMembers.map(
            p => `${p.number} ${nicknames.get(p.id)} (${p.role})`
          )} suicided when Sect Leader ${deadPlayer.number} ${nicknames.get(
            deadPlayer.id
          )} died.`
        )
      }
    }

    // SEER REPLACEMENT
    if (suicide != "corr") {
      game.running = "get a new seer"
      if (deadPlayer.role == "Seer" && game.players.find(p => p.alive && p.role == "Seer Apprentice")) {
        let seerApps = game.players.filter(p => p.alive && p.role == "Seer Apprentice")
        let chosenOne = seerApps[Math.floor(Math.random()*seerApps.length)]

        chosenOne.role = "Seer"
        getUser(client, chosenOne.id).send(
          new Discord.MessageEmbed()
            .setTitle("Master")
            .setThumbnail(getEmoji(client, "Seer").url)
            .setDescription("The Seer was killed. You are now a Seer!")
        )
        addLog(
          game,
          `Seer Apprentice ${chosenOne.number} ${nicknames.get(
            chosenOne.id
          )} became a Seer after their master ${
            deadPlayer.number
          } ${nicknames.get(deadPlayer.id)} died.`
        )
      }
    }

    game.running = "box a dead soul"
    if (game.players.find(p => p.role == "Soul Collector" && p.alive && p.box.includes(deadPlayer.number)) &&
        roles[deadPlayer.role].team == "Village" && !deadPlayer.sect && deadPlayer.killedBy &&
        ["Village","Werewolves"].includes(roles[game.players[deadPlayer.killedBy-1].role].team)) {
      let sc = game.players.find(p => p.role == "Soul Collector" && p.alive && p.box.includes(deadPlayer.number))
      deadPlayer.boxed = true
      broadcastTo(
        client, game.players.filter(p => !p.left),
        new Discord.MessageEmbed()
          .setTitle("Your soul is mine")
          .setThumbnail(getEmoji(client, "Soul"))
          .setDescription(
            `The Soul Collector took **${deadPlayer.number} ${nicknames.get(deadPlayer.id)}**'s soul!` +
            " They cannot talk to the Medium or the dead, and cannot be revived until the Soul Collector is dead!"
          )
      )
      addLog(
        game,
        `Soul Collector ${sc.number} ${nicknames.get(sc.id)} took the soul of ${
          deadPlayer.number
        } ${nicknames.get(deadPlayer.id)} (${deadPlayer.role}).`
      )
    }
  }
          
  game.running = "test for tie after any death"
  let alive = game.players.filter(p => p.alive)
  if (
    !alive.length
  ) {
    game.running = "tie end"
    game.currentPhase = 999
    broadcastTo(
      client,
      game.players.filter(p => !p.left),
      new Discord.MessageEmbed()
        .setTitle("Game has ended.")
        .setThumbnail(getEmoji(client, "Death").url)
        .setDescription(`It was a tie. There are no winners.`)
    )
    game.running = "give tie xp"
    addXP(game, game.players.filter(p => !p.suicide), 15)
    addXP(game, game.players.filter(p => !p.left), 15)
    addWin(game, [])
    addLog(
      game,
      `[RESULT] The game ended in a tie. No one won!`
    )
  }

  return game
}

const createTalisman = async (client, role, level) => {
  if(typeof role == "string") role = Object.values(roles).find(data => data.name.toLowerCase().startsWith(role.toLowerCase()) || (data.abbr && data.abbr.includes(role.toLowerCase())))
  if (!role) return undefined
  const canvas = Canvas.createCanvas(128, 128);
  const ctx = canvas.getContext('2d');
  // if(!level) level = 1
  // if(typeof level != "number") level = parseInt(level, 10)
  // if(level == 1 || level < 15) level = 1
  // if(level == 2 || level <= 20) level = 2
  // if(level == 3 || level <= 25) level = 3
  // if(level == 4 || level <= 30) level = 4
  // let name = `Talisman${level == 1 ? "" : `_${level}`}`
  name = `Talisman`
  console.log(name)
  const background = await Canvas.loadImage(getEmoji(client, name).url)
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  
  const icon = await Canvas.loadImage(getEmoji(client, role.name).url+"?size=64");
  ctx.translate(canvas.width/2,canvas.height/2);
  ctx.drawImage(icon,-icon.width/2,-icon.height/2);
  ctx.translate(-canvas.width/2,-canvas.height/2);
  const result = await canvas.toBuffer();
  const attachment = await new Discord.MessageAttachment(result, 'talisman.png');
  return attachment
}

const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

const randomString = (len) => {
  let buf = []
  , chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  , charlen = chars.length;
  
  for (var i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }
  
  return buf.join('');
};

const addLog = (logid, msg) => {
  if(typeof logid === "object") logid = logid.gameID
  if(typeof logid === "number") logid = logid.toString()
  if(!typeof logid === "string") throw new TypeError('First parameter must be a game object or log ID')
  if(!typeof msg === "string") msg = msg.toString()
  if(msg === "-divider-") msg = "=============================="
  if(msg === "-divider2-") msg = "------------------------------"
  msg = `${time()} | ` + msg
  msg = msg.replace(/\\/g,"")
  msg = msg.replace(/\n/g,`\n${time()} | `)
  logs.push(logid, msg)
}

const writeLogs = (logid) => {
  if(typeof logid === "object") logid = logid.gameID
  if(typeof logid === "number") logid = logid.toString()
  if(!typeof logid === "string") throw new TypeError('First parameter must be a game object or log ID')
  if(!logid) return
  let fulllog = logs.get(logid)
  if(!fulllog) return false
  fs.appendFile('/app/logs/' + logid + ".log", fulllog.join("\n")+"\n", (err) => {
    if (err) throw err;
    logs.delete(logid)
  });
}

module.exports = {
  time: time,
  utcTime: utcTime,
  date: utcTime,
  ago: ago,
  embed: embed,
  error: error,
  getUser: getUser,
  getMember: getMember,
  getEmoji: getEmoji,
  getRole: getRole,
  paginator: paginator,
  deepClone: deepClone,
  clone: deepClone,
  sleep: sleep,
  wait: sleep,
  broadcast: broadcast,
  broadcastTo: broadcastTo,
  addXP: addXP,
  addWin: addWin,
  death: death,
  gameEmbed: gameEmbed,
  createTalisman: createTalisman,
  getRandomInt: getRandomInt,
  randomString: randomString,
  addLog: addLog,
  writeLogs: writeLogs,
  writeLog: writeLogs
}