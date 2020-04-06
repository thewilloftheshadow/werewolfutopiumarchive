const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles")

module.exports = {
  name: "create",
  run: async (client, message, args, shared) => {
    // if (!players.get(`${message.author.id}.custom`))
    if (!client.guilds.cache.get('522638136635817986').members.cache.get(message.author.id).roles.cache.find(r => r.name == 'ww cc') &&
        !players.get(`${message.author.id}.inventory.${"custom maker"}`))
      return await message.author.send("You cannot create custom games!")
    
    if (players.get(`${message.author.id}.prompting`)) 
      return await message.author.send("You have an active prompt already!")
    
    // players.set(`${message.author.id}.prompting`, true)
    
    // if (!games.get("count")) games.set("count", 0)
    if (!games.get("quick")) games.set("quick", [])
    let Games = games.get("quick")
    
    if (Games.find(g => g.gameID == players.get(`${message.author.id}.currentGame`) && g.currentPhase < 999)) 
      return await message.author.send("You are already in a game!")
    
    let currentGame = {
      mode: "custom",
      nextPhase: null,
      currentPhase: -1,
      originalRoles: [],
      players: [{
        id: message.author.id,
        lastAction: moment()
      }],
      spectators: [],
      logs: "",
      logMsgs: [],
      config: {
        deathReveal: true,
        nightTime: 45,
        dayTime: 60,
        votingTime: 45,
        private: false,
        talismans: true
      }
    }
    
    let rolePrompt = await message.author.send(
      new Discord.MessageEmbed()
        .setTitle("Custom Game Setup")
        .setDescription(
          `Select roles for your custom game by inputting their names or aliases.\n` +
          "You have 30 seconds for each role. Type `end` to end your selection."
        )
    )
    
    for (var i = 0; i < 16; i++) {
      let inputRole = await rolePrompt.channel
        .awaitMessages(msg => msg.author.id == message.author.id, { time: 30*1000, max: 1, errors: ["time"] })
        .catch(() => {})
      
      if (i < 4 && !inputRole)
        return await message.author.send(
          new Discord.MessageEmbed()
            .setColor("RED")
            .setTitle("Prompt timed out.")
        )
      else if (!inputRole || (inputRole.first().content.toLowerCase() == "end" && i >= 4))
        break;
      else if (inputRole.first().content.toLowerCase() == "end" && i < 4) {
        return await message.author.send(
          new Discord.MessageEmbed()
            .setColor("RED")
            .setTitle("You cannot create a game with less than 4 roles!")
        )
      }
      inputRole = inputRole.first().content.replace(/(_|\s+)/g, " ")
      
      let role = Object.values(roles).find(data => data.name.toLowerCase().startsWith(inputRole.toLowerCase()) || (data.abbr && data.abbr.includes(inputRole.toLowerCase())))
      if (!role) {
        await message.author.send("Unknown role.")
        i--; continue;
      }
      if (role.oneOnly && currentGame.originalRoles.indexOf(role) !== -1)
        return await message.author.send(
          new Discord.MessageEmbed()
            .setColor("RED")
            .setTitle(`Input invalid: there can only be one ${role} in each game!`)
        )
      currentGame.originalRoles.push(role.name)
    }
    
    await message.author.send(
      new Discord.MessageEmbed()
        .setTitle("Custom Game Setup")
        .setDescription(
          currentGame.originalRoles
            .map(r => `${fn.getEmoji(client, r)} ${r}`).join('\n')
        )
    )
    
    while (!currentGame.gameID) {
      let gcPrompt = await message.author.send(
        new Discord.MessageEmbed()
          .setTitle("Custom Game Setup")
          .setDescription(
            `Select a join code for your game.`
          )
      )
      
      let gcInput = await gcPrompt.channel
        .awaitMessages(msg => msg.author.id == message.author.id, { time: 30*1000, max: 1, errors: ["time"] })
        .catch(() => {})
      if (!gcInput)
        return await message.author.send(
          new Discord.MessageEmbed()
            .setColor("RED")
            .setTitle("Prompt timed out.")
        )
      gcInput = gcInput.first().content
      
      let usedGCs = games.get('quick').filter(x => x.mode == 'custom').map(x => x.gameID.toLowerCase())
      // console.log(usedGCs)
      
      if (!client.guilds.cache.get("522638136635817986").members.cache.get(message.author.id).roles.cache.find(r => ["βTester Helper","Developer"].includes(r.name)) && gcInput.toLowerCase().match(/^betatest\_.*?$/i))
        await gcPrompt.channel.send("You cannot create a beta test game!")
      else if (!client.guilds.cache.get("522638136635817986").members.cache.get(message.author.id).roles.cache.find(r => r.name == "Developer") && gcInput.toLowerCase().match(/^devtest\_.*?$/i))
        await gcPrompt.channel.send("You cannot create a developer test game!")
      else if (parseInt(gcInput) != gcInput && gcInput.match(/^[a-z0-9\_]{3,15}$/i) && !usedGCs.includes(gcInput.toLowerCase()))
        currentGame.gameID = gcInput
      else if (parseInt(gcInput) == gcInput)
        await gcPrompt.channel.send("You cannot have an integral number as your game code.")
      else if (gcInput.length < 3)
        await gcPrompt.channel.send("Your game code must be at least 3 characters long.")
      else if (gcInput.length > 15)
        await gcPrompt.channel.send("Your game code must be at most 15 characters long.")
      else if (!gcInput.match(/^[a-z0-9\_]{3,15}$/i))
        await gcPrompt.channel.send("Your game code must only include alphanumerical characters and underscores.")
      else if (usedGCs.includes(gcInput.toLowerCase()))
        await gcPrompt.channel.send("Your game code has been taken.")
    }
    
    while (!currentGame.name) {
      let namePrompt = await message.author.send(
        new Discord.MessageEmbed()
          .setTitle("Custom Game Setup")
          .setDescription(
            `Select a name for your game.`
          )
      )
      
      let nameInput = await namePrompt.channel
        .awaitMessages(msg => msg.author.id == message.author.id, { time: 30*1000, max: 1, errors: ["time"] })
        .catch(() => {})
      if (!nameInput)
        return await message.author.send(
          new Discord.MessageEmbed()
            .setColor("RED")
            .setTitle("Prompt timed out.")
        )
      nameInput = nameInput.first().content
      
      if (!client.guilds.cache.get("522638136635817986").members.cache.get(message.author.id).roles.cache.find(r => ["βTester Helper","Developer"].includes(r.name)) && nameInput.toLowerCase().match(/beta/i))
        await namePrompt.channel.send("You cannot create a beta test game!")
      else if (!client.guilds.cache.get("522638136635817986").members.cache.get(message.author.id).roles.cache.find(r => r.name == "Developer") && nameInput.toLowerCase().match(/dev/i))
        await namePrompt.channel.send("You cannot create a developer test game!")
      else if (nameInput.match(/^[^*_`\\()[\]>\n]{3,30}$/i))
        currentGame.name = nameInput
      else if (nameInput.length < 3)
        await namePrompt.channel.send("Your game name must be at least 3 characters long.")
      else if (nameInput.length > 30)
        await namePrompt.channel.send("Your game name must be at most 30 characters long.")
      else if (!nameInput.match(/^[^*_`\\()[\]>\n]{3,30}$/i))
        await namePrompt.channel.send("Your game name contains invalid characters.")
    }
    
    let settingsPrompt = await message.author.send(
      new Discord.MessageEmbed()
        .setTitle("Custom Game Setup")
        .setDescription(
          `Use default settings?`
        )
    )
    await settingsPrompt.react(fn.getEmoji(client, 'green tick'))
    await settingsPrompt.react(fn.getEmoji(client, 'red tick'))
    let reactions = await settingsPrompt.awaitReactions(
      (r, u) =>
        (r.emoji.id == fn.getEmoji(client, "green_tick").id ||
          r.emoji.id == fn.getEmoji(client, "red_tick").id) &&
        u.id == message.author.id,
      { time: 30*1000, max: 1, errors: ['time'] }
    ).catch(() => {})
    if (!reactions)
      return await message.author.send(
        new Discord.MessageEmbed()
          .setColor("RED")
          .setTitle("Prompt timed out.")
      )
    let reaction = reactions.first().emoji
    if (reaction.id == fn.getEmoji(client, "red_tick").id) {
      // SETUP TIME
      let timeSuccess = false
      while (!timeSuccess) {
        let timePrompt = await message.author.send(
          new Discord.MessageEmbed()
            .setTitle("Custom Game Setup")
            .setDescription(
              `Select the length of night, day and voting periods.\n` +
              `Maxiumum of each period is 120 seconds and minimum is 1 second.\n` +
              `Input as \`night day voting\` in seconds. (default: \`45 60 45\`)`
            )
        )

        let timeInput = await timePrompt.channel
          .awaitMessages(msg => msg.author.id == message.author.id, { time: 30*1000, max: 1, errors: ["time"] })
          .catch(() => {})
        if (!timeInput)
          return await message.author.send(
            new Discord.MessageEmbed()
              .setColor("RED")
              .setTitle("Prompt timed out.")
          )
        timeInput = timeInput.first().content.split(' ')
        timeInput = [parseInt(timeInput[0]),parseInt(timeInput[1]),parseInt(timeInput[2])]
        if (timeInput.length < 3 || isNaN(timeInput[0]) || isNaN(timeInput[1]) || isNaN(timeInput[2]) ||
            timeInput[0] > 120 || timeInput[1] > 120 || timeInput[2] > 120 ||
            timeInput[0] < 1 || timeInput[1] < 1 || timeInput[2] < 1) {
          await message.author.send(
            new Discord.MessageEmbed()
              .setColor("RED")
              .setTitle("Invalid input.")
          )
          continue;
        }
        [currentGame.config.nightTime, currentGame.config.dayTime, currentGame.config.votingTime] = timeInput
        timeSuccess = true
      }
      
      // SETUP REVEAL
      let revealSuccess = false
      while (!revealSuccess) {
        let revealPrompt = await message.author.send(
          new Discord.MessageEmbed()
            .setTitle("Custom Game Setup")
            .setDescription(
              `Reveal roles on death?`
            )
        )
        
        await revealPrompt.react(fn.getEmoji(client, 'green tick'))
        await revealPrompt.react(fn.getEmoji(client, 'red tick'))
        let rReactions = await revealPrompt.awaitReactions(
          (r, u) =>
            (r.emoji.id == fn.getEmoji(client, "green_tick").id ||
              r.emoji.id == fn.getEmoji(client, "red_tick").id) &&
            u.id == message.author.id,
          { time: 30*1000, max: 1, errors: ['time'] }
        ).catch(() => {})
        if (!rReactions)
          return await message.author.send(
            new Discord.MessageEmbed()
              .setColor("RED")
              .setTitle("Prompt timed out.")
          )
        let rReaction = rReactions.first().emoji
        if (rReaction.id == fn.getEmoji(client, "green_tick").id) currentGame.config.deathReveal = true
        else currentGame.config.deathReveal = false
        revealSuccess = true
      }
    }
    // SETUP PRIVATE
    let talismanSuccess = false
    while (!talismanSuccess) {
      let talismanPrompt = await message.author.send(
        new Discord.MessageEmbed()
        .setTitle("Custom Game Setup")
        .setDescription(
          `Talismans enabled?`
        )
      )
      
      await talismanPrompt.react(fn.getEmoji(client, 'green tick'))
      await talismanPrompt.react(fn.getEmoji(client, 'red tick'))
      let pReactions = await talismanPrompt.awaitReactions(
        (r, u) =>
        (r.emoji.id == fn.getEmoji(client, "green_tick").id ||
         r.emoji.id == fn.getEmoji(client, "red_tick").id) &&
        u.id == message.author.id,
        { time: 30*1000, max: 1, errors: ['time'] }
      ).catch(() => {})
      if (!pReactions)
        return await message.author.send(
          new Discord.MessageEmbed()
          .setColor("RED")
          .setTitle("Prompt timed out.")
        )
      let pReaction = pReactions.first().emoji
      if (pReaction.id == fn.getEmoji(client, "green_tick").id) currentGame.config.talismans = true
      else currentGame.config.talismans = false
      talismanSuccess = true
    }  
    
    // SETUP PRIVATE
    let privateSuccess = false
    while (!privateSuccess) {
      let privatePrompt = await message.author.send(
        new Discord.MessageEmbed()
          .setTitle("Custom Game Setup")
          .setDescription(
            `Private game?`
          )
      )

      await privatePrompt.react(fn.getEmoji(client, 'green tick'))
      await privatePrompt.react(fn.getEmoji(client, 'red tick'))
      let pReactions = await privatePrompt.awaitReactions(
        (r, u) =>
          (r.emoji.id == fn.getEmoji(client, "green_tick").id ||
            r.emoji.id == fn.getEmoji(client, "red_tick").id) &&
          u.id == message.author.id,
        { time: 30*1000, max: 1, errors: ['time'] }
      ).catch(() => {})
      if (!pReactions)
        return await message.author.send(
          new Discord.MessageEmbed()
            .setColor("RED")
            .setTitle("Prompt timed out.")
        )
      let pReaction = pReactions.first().emoji
      if (pReaction.id == fn.getEmoji(client, "green_tick").id) currentGame.config.private = true
      else currentGame.config.private = false
      privateSuccess = true
    }
    
    await message.author.send(
      new Discord.MessageEmbed()
        .setTitle('Created new Custom Game!')
        .setDescription(
          `**Lobby Name:** ${currentGame.name}\n` +
          `**Game Code:** ${currentGame.gameID.replace(/_/g, "\\_")}\n` +
          `**Game Roles:** ${currentGame.originalRoles.map(x => fn.getEmoji(client, x)).join('')}`
        )
        .addField(
          'Configuration',
          `**Time:** Night ${currentGame.config.nightTime}s / Day ${currentGame.config.dayTime}s / Voting ${currentGame.config.votingTime}s\n` +
          `**Death Reveal:** ${currentGame.config.deathReveal}\n` +
          `**Talismans:** ${currentGame.config.talismans ? "Enabled" : "Disabled"}\n` +
          `**Private:** ${currentGame.config.private}\n`
        )
    )
    
    fn.broadcastTo(
      client, currentGame.players.filter(p => p.id !== message.author.id),
      new Discord.MessageEmbed()
        .setAuthor(`${nicknames.get(message.author.id).replace(/\\_/g, "_")} joined the game.`, message.author.displayAvatarURL)         
        .addField(`Current Players [${currentGame.players.length}]`, currentGame.players.map(player => nicknames.get(player.id)).join("\n"))
        .setFooter(`Custom Game Code: ${currentGame.gameID}`)
    )
    
    Games = games.get("quick")
    Games.push(currentGame)
    games.set("quick", Games)
    
    players.set(`${message.author.id}.currentGame`, currentGame.gameID)
    // players.set(`${message.author.id}.prompting`, false)
  }
}