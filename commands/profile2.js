const Discord = require("discord.js"),
      db = require("quick.db")

const players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn')

module.exports = {
  name: "profilelink",
  aliases: ["p2","profile2","plink"],
  run: async (client, message, args) => {
    let target
    if (!args[0]) target = message.author
    else if (message.mentions.users.size) target = message.mentions.users.first()
    if (!target && args[0]) 
      target = fn.getUser(
        client, 
        nicknames.all().find(x => JSON.parse(x.data).toLowerCase() == args[0].toLowerCase().replace(/_/g, "\\_")) ? 
        nicknames.all().find(x => JSON.parse(x.data).toLowerCase() == args[0].toLowerCase().replace(/_/g, "\\_")).ID : args[0]
      )
    if (args[0] && !target)
      return await message.channel.send(`${fn.getEmoji(client, "red_tick")} User \`${args[0]}\` not found.`)
    if (!target)
      return await message.channel.send(`${fn.getEmoji(client, "red_tick")} Target not found.`)
    
    let player = players.get(target.id)
    if (!player)
      return await message.channel.send(`${fn.getEmoji(client, "red_tick")} Target not found.`)
    
    message.channel.send("Here's a link to your personal profile on the bot's website:\nhttps://werewolf-utopium.glitch.me/profile/"+nicknames.get(target.id))
  }
}