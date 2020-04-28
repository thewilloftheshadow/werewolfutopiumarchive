const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db"),
      Canvas = require("canvas"),
      probe = require('probe-image-size');

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles"),
      shop = require("/app/util/shop")

module.exports = {
  name: "equip",
  aliases: ["eq"],
  run: async (client, message, args) => {
    if (!players.get(`${message.author.id}.inventory.talisman`))
      return await message.channel.send(
        new Discord.MessageEmbed()
          .setColor("RED")
          .setTitle("You do not have any talismans yet!")
          .setDescription("Go get them at `w!shop` or from lootboxes and daily rewards!")
      )
    
    let targetRole = args.join(' ')
    let role = Object.values(roles).find(
      data =>
        data.name.toLowerCase().startsWith(targetRole.toLowerCase()) ||
         (data.abbr && data.abbr.includes(targetRole.toLowerCase()))
    )
    
    if (!role) return await message.channel.send("Unknown role.")
    if (role.name == "Accomplice")
      return await message.react(fn.getEmoji(client, "harold"))
    
    let talisman = await fn.createTalisman(client, role.name)
    
    if (!players.get(`${message.author.id}.inventory.talisman.${role.name}`))
      return await message.channel.send(
        new Discord.MessageEmbed()
          .setColor("RED")
          .attachFiles([talisman])
          .setThumbnail(`attachment://${talisman.name}`)
          .setTitle("You do not have this talismans yet!")
          .setDescription("Go get them at `w!shop` or from lootboxes and daily rewards!")
      )
    
    players.set(`${message.author.id}.talEq`, role.name)
    
    await message.channel.send(
      new Discord.MessageEmbed()
        .setColor("GREEN")
        .attachFiles([talisman])
        .setThumbnail(`attachment://${talisman.name}`)
        .setTitle(`You are now equipped with ${role.name} Talisman.`)
        .setDescription("They can be used in Quick Games and Custom Games that have enabled usage of talismans.")
    )
  }
}