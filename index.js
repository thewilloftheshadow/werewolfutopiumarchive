/* --- ALL PACKAGES --- */

require('es6-shim')

const Discord = require('discord.js'),
      fs = require("fs"),
      moment = require('moment'),
      fetch = require('node-fetch'),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames"),
      temp = new db.table("temp")

const roles = require("/app/util/roles")

/* --- ALL PACKAGES --- */

/* --- ALL GLOBAL CONSTANTS & FUNCTIONS --- */
const client = new Discord.Client(),
      config = require('/app/util/config'),
      fn = require('/app/util/fn')

client.commands = new Discord.Collection()
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
for (const file of commandFiles) {
	const command = require(`./commands/${file}`)
	client.commands.set(command.name, command)
}

const token = process.env.DISCORD_BOT_TOKEN

/* --- ALL GLOBAL CONSTANTS & FUNCTIONS --- */

client.login(token)

client.once('ready', async () => {
  console.log(`${fn.time()} | ${client.user.username} is up!`)
  
  client.user.setPresence({ activity: { name: 'for Werewolf Simulation Games' , type: "WATCHING"}, status: 'idle' })

  require('/app/process/game.js')(client)
  
  let rebootchan = temp.get("rebootchan")
  if(rebootchan){
    temp.delete("rebootchan")
    client.channels.cache.get(rebootchan).send("Bot has successfully been restarted!").catch(() => temp.delete("rebootchan"))
  }
})

client.on('message', async message => {
  
  if (message.author.bot) return;
  
  let me = players.get(message.author.id)
  if (me && me.afk) {
    players.delete(`${message.author.id}.afk`)
    message.channel.send("You are no longer AFK.")
  }
  
  const msg = message.content.trim().toLowerCase()
  
  const prefix = "w!"
  
  let shared = {}
    
  if (message.content.toLowerCase().startsWith(prefix)) {
    
    let args = message.content.trim().slice(prefix.length).split(/\s+/u)
    shared.prefix = prefix
    
		const commandName = args.shift().toLowerCase()
		shared.commandName = commandName
		const command = client.commands.get(commandName) || client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName))

		if (!command) return;
    
    if (!players.get(message.author.id) || !nicknames.get(message.author.id)) {
      let player = players.get(message.author.id) || {
        xp: 0,
        coins: 0,
        roses: 0,
        gems: 0,
        currentGame: null,
        wins: [],
        loses: [],
        suicides: 0,
        inventory: {}
      }
      
      await message.channel.send("Please check your DMs!")
       
      let m = await message.author.send(
        new Discord.MessageEmbed()
          .setTitle("Please choose a username to proceed.")
          .setDescription("You have 1 minute to respond.")
      ).catch(() => {})
      if (!m) return await message.channel.send("I cannot DM you!")
      
      let input
      while (!input) {
        let response = await m.channel.awaitMessages(msg => msg.author.id == message.author.id, { max: 1, time: 60*1000, errors: ["time"] }).catch(() => {})
        if (!response) return await m.channel.send("Question timed out.")
        response = response.first().content
        
        let usedNicknames = nicknames.all().map(x => x.data.toLowerCase())
        
        if (response.match(/^[a-z0-9\_]{3,14}$/i) && !usedNicknames.includes(response.toLowerCase()))
          input = response.replace(/_/g, "\\_")
        else if (response.length > 14)
          await m.channel.send("This username is too long!")
        else if (response.length < 3)
          await m.channel.send("This username is too short!")
        else if (!response.match(/^[a-z0-9\_]{3,14}$/i))
          await m.channel.send("This username contains invalid characters! Only alphanumerical characters or underscores are accepted.")
        else if (usedNicknames.includes(response.toLowerCase()))
          await m.channel.send("This username has been taken!")
        else
          await m.channel.send("Invalid username. Please try again.")
      }
      
      nicknames.set(message.author.id, input)
      player.lastNick = moment()
      
      players.set(message.author.id, player)
    }
    
    message.delete().catch(error => {})
		try {
			await command.run(client, message, args, shared)
		} catch (error) {
			await client.channels.cache.get("664285087839420416").send(
        new Discord.MessageEmbed()
          .setDescription(
            `An error occured when ${message.author} attempted the following command: \`${
              message.content.replace(/(`)/g, "\$1")
            }\``
          )
          .addField(
            "Error Description",
            `\`\`\`${error.stack.replace(/(?:(?!\n.*?\(\/app.*?)\n.*?\(\/.*?\))+/g, "\n\t...")}\`\`\``
          )
      )
      
      await message.channel.send(`${fn.getEmoji(client, "red_tick")} An error occurred when trying to execute this command. Please contact staff members.`)
		}
    
	}
})

client.on('message', async message => {  
  if (message.author.bot || message.channel.type !== 'dm') return;
  console.log(message.author.tag + ' | ' + message.cleanContent)
  
  let player = players.get(message.author.id)
  if (!player || !player.currentGame) return;
  
  let QG = games.get("quick")
  let game = QG.find(game => game.gameID == player.currentGame)
  if (!game) return undefined;
  let gamePlayer = game.players.find(player => player.id == message.author.id)
  
  gamePlayer.lastAction = moment()
  gamePlayer.prompted = false
  games.set("quick", QG)
  
  if (message.channel.type !== "dm" || message.author.bot) return;
  if (message.content.toLowerCase().startsWith('w!') || message.content.toLowerCase() == "w!") return;
  
  let pastMessages = (await message.channel.messages.fetch({ limit: 30 })).filter(m => m.author.id == message.author.id).first(6)
  if (pastMessages.length == 6 && new Date(pastMessages[pastMessages.length-1].createdTimestamp + 5000) >= new Date()) {
    await message.channel.send("Your message is not sent for the following reason: **You are sending messages too fast.**")
    client.channels.cache.get("699144758525952000").send(
      new Discord.MessageEmbed()
        .setTitle(`**${nicknames.get(message.author.id)}** (${message.author.id}) was auto-warned in ${game.mode == 'custom' ? `${game.name} [\`${game.gameID}\`]` : `Game #${game.gameID}`}.`)
        .addField("Reason", "Sending messages too fast")
    )
    return undefined
  }

  let input = message.cleanContent
  input = input.replace(/\\?\|\\?\|(?:.|\s)*?\\?\|\\?\|/g, "$1")
      .replace(/\\?~\\?~(?:.|\s)*?\\?~\\?~/g, "$1")
      .replace(/\\?\*\\?\*\\?\*(?:.|\s)*?\\?\*\\?\*\\?\*/g, "$1")
      .replace(/\\?\*\\?\*(?:.|\s)*?\\?\*\\?\*/g, "$1")
      .replace(/\\?\*(?:.|\s)*?\\?\*/g, "$1")
      .replace(/\\?_\\?_(?:.|\s)*?\\?_\\?_/g, "$1")
      .replace(/\\?_(?:.|\s)*?\\?_/g, "$1")
      .replace(/\\?`\\?`\\?`(?:(?:[^\s]*?\n)?(.+?)|((.|\s)*?))\\?`\\?`\\?`/g, "$1$2")
      .replace(/\\?`((?!w\!).*?)\\?`/gi, "$1")
      .replace(/^\\?>\s*/gm, "")
      .replace(/\\?<(?:#|@|@&)[^\s]*?>/g, "")
      .replace(/(https?:\/\/)?((([^.,\/#!$%\^&\*;:{}=\-_`~()\[\]\s])+\.)+([^.,\/#!$%\^&\*;:{}=\-_`~()\[\]\s])+|localhost)(:\d+)?(\/[^\s]*)*/gi, "")
  
  let bwlA = ["fuck","fuk","fak","fck","shit","shat","sex","s3x","horny","ass",
              "pussy","arse","penis","vagina","viagra","dick","cock","dicc","fucc",
              "cocc","nigg","niga","masterbate","anal","anus","jerk off","jack off",
              "jerkoff","jackoff","corona","piss","semen","a\\$\\$","n1g","c0c",
              "c0rona","cor0na"] // filter regardless
  let bwlB = ["nig","cum"] // filter if individual word 
  let censor = "*************".split('').join("*******************************") // censor characters
  // let beforePC = input
  // input = input.replace(new RegExp(`(?<=[^\\s]*?(?:${bwlA.join('|')})[^\\s]*?)[^\\s]`,"gi"), "*")
  //   .replace(new RegExp(`(${bwlA.join('|')}|${bwlB.map(x => `\\b${x}\\b`).join('|')})`,"gi"), x => censor.substring(0, x.length))
  // if (beforePC !== input) {
  //   await message.channel.send("You are auto-warned for the following reason: **Please refrain from using profanity!**")
  //   client.channels.cache.get("699144758525952000").send(
  //     new Discord.MessageEmbed()
  //       .setTitle(`**${nicknames.get(message.author.id)}** (${message.author.id}) was auto-warned in ${game.mode == 'custom' ? `${game.name} [\`${game.gameID}\`]` : `Game #${game.gameID}`}.`)
  //       .setDescription(message.content)
  //       .addField("Reason", "Profanity")
  //   )
  // }
      
  input = input.split(/\n/g)
  
  if (input.length > 5) {
    await message.channel.send("Your message is not sent for the following reason: **Too many lines in one message.**")
    client.channels.cache.get("699144758525952000").send(
      new Discord.MessageEmbed()
        .setTitle(`**${nicknames.get(message.author.id)}** (${message.author.id}) was auto-warned in ${game.mode == 'custom' ? `${game.name} [\`${game.gameID}\`]` : `Game #${game.gameID}`}.`)
        // .setDescription(message.content)
        .addField("Reason", "Too many lines in one message")
    )
    return undefined
  }
  
  //console.log(input)
  for (var i = 0; i < input.length; i++) {
    var content = input[i]
    
    if (gamePlayer.role == "Drunk" && game.currentPhase < 999) {
      content = content.split(/\s/g)
      for (var x = 0; x < Math.floor(Math.random()*content.length*2); x++) {
        let swapI1 = Math.floor(Math.random()*content.length)
        let swapI2 = Math.floor(Math.random()*content.length);
        [content[swapI1], content[swapI2]] = [content[swapI2], content[swapI1]]
      }
      content = content.join(" ")
    }
    
    if (content.trim().length == 0) continue;
    
    game = QG.find(game => game.gameID == player.currentGame)
    if (!game) return;
    
    if (i !== 0) await fn.wait(Math.ceil(content.length/10)*750)

    if (game.currentPhase == -1) {
      fn.broadcast(client, game, `**${nicknames.get(message.author.id)}**: ${content}`, [message.author.id])
      continue;
    }
    if (game.currentPhase == -.5) return await message.author.send("Your message was not sent for the following reason: **The game is starting!**")
    
    if (game.currentPhase >= 999)
      if (gamePlayer.alive) {
        fn.broadcastTo(
          client, game.players.filter(p => !p.left && p.id != message.author.id),
          `**${gamePlayer.number} ${nicknames.get(message.author.id)}** ${fn.getEmoji(client, gamePlayer.role)}: ${content}`
        )
        continue;
      }
      else {
        fn.broadcastTo(
          client, game.players.filter(p => !p.left && p.id != message.author.id),
          `***${gamePlayer.number} ${nicknames.get(message.author.id)}*** ${fn.getEmoji(client, gamePlayer.role)}: *${content}*`
        )
        continue;
      }

    if (gamePlayer.mute && game.players[gamePlayer.mute-1].role == "Grumpy Grandma") content = "..."
    if (gamePlayer.mute && game.players[gamePlayer.mute-1].role == "Corruptor") return;

    if (game.currentPhase % 3 != 0)
      if (gamePlayer.alive) {
        fn.broadcastTo(
          client, game.players.filter(p => !p.left && p.id != message.author.id),
          `**${gamePlayer.number} ${nicknames.get(message.author.id)}**: ${content}`
        )
        continue;
      }
      else if (!gamePlayer.alive && gamePlayer.boxed && game.players.find(p => p.role == "Soul Collector" && p.alive)) continue;
      else {
        fn.broadcastTo(
          client, game.players.filter(p => !p.left && !p.alive && p.id != message.author.id),
          `***${gamePlayer.number} ${nicknames.get(message.author.id)}***${gamePlayer.roleRevealed ? ` ${fn.getEmoji(client, gamePlayer.roleRevealed)}` : ""}: *${content}*`
        )
        continue;
      }
    if (game.currentPhase % 3 == 0) {
      if (!gamePlayer.alive && gamePlayer.boxed && game.players.find(p => p.role == "Soul Collector" && p.alive)) return undefined
      else if (!gamePlayer.alive) {
        fn.broadcastTo(
          client, game.players.filter(p => !p.left && (!p.alive || (p.alive && p.role == "Medium")) && p.id != message.author.id),
          `***${gamePlayer.number} ${nicknames.get(message.author.id)}***${gamePlayer.roleRevealed ? ` ${fn.getEmoji(client, gamePlayer.roleRevealed)}` : ""}: *${content}*`
        )
        continue;
      }
      if (gamePlayer.role == "Medium" && gamePlayer.alive && !gamePlayer.jailed) {
        fn.broadcastTo(
          client, game.players.filter(p => !p.left && (!p.alive || (p.alive && p.role == "Medium")) && p.id != message.author.id).map(p => p.id),
          `**Medium**: ${content}`
        )
        continue;
      }

      if (gamePlayer.jailed && gamePlayer.alive) {
        fn.getUser(client, game.players[game.originalRoles.indexOf("Jailer")].id)
          .send(`**${gamePlayer.number} ${nicknames.get(message.author.id)}**: ${
                typeof content == "string" && content.match(new RegExp(`\\b${game.players[game.originalRoles.indexOf("Jailer")].number}\\b`, "gi")) ?
                  `> ${content}` : content
                }`)
        continue;
      }

      if (gamePlayer.role == "Jailer" && gamePlayer.alive) { 
        if (game.players.find(p => p.jailed && p.alive))
          fn.getUser(client, game.players.find(p => p.jailed && p.alive).id)
            .send(`**<:Jailer:658633215824756748> Jailer**: ${content}`)
        else
          message.author.send("You did not jail anyone or your target cannot be jailed.")
        continue;
      }

      if (roles[gamePlayer.role].team == "Werewolves" && gamePlayer.role !== "Sorcerer" && !gamePlayer.jailed) {
        fn.broadcastTo(
          client,
          game.players
            .filter(p => roles[p.role].team == "Werewolves" &&
                    gamePlayer.role !== "Sorcerer" && !p.jailed && 
                    gamePlayer.id != p.id),
          `**<:Fellow_Werewolf:660825937109057587> ${gamePlayer.number} ${nicknames.get(message.author.id)}**: ${content}`)
      }
    }
  }
})

// AFK mentioning detector
client.on('message', async message => {
  if (message.author.bot) return;
  
  if(!message.mentions.members) return
  let mentions = message.mentions.members.map(x => x.id)
  let afkmentions = mentions.filter(x => {
    let player = players.get(`${x}`)
    if (player && player.afk) return true
    else return false
  })
  if (afkmentions.length)
  return await message.channel.send(
    new Discord.MessageEmbed()
      .setColor(0x888888)
      .setTitle("AFK Members")
      .setDescription(
        afkmentions.map(x => `**<@${x}> (${nicknames.get(x) ? nicknames.get(x) : client.users.cache.get(x).username})** | ${players.get(`${x}.afk`)}`).slice(0, 10).join('\n') +
        (afkmentions.length > 10 ? `\nand ${afkmentions.length-10} more...` : "")
      )
  )
})

require("./server.js")(client) //starts web server