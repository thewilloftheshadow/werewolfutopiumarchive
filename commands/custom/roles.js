const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles")

module.exports = {
  name: "roles",
  aliases: ["role"],
  run: async (client, message, args, shared) => {
    let embed = new Discord.MessageEmbed()
    .setTitle(`Custom Roles for ${nicknames.get(message.author.id)}`)
    .addField("\u200b", "\u200b")
    .setFooter(`You can buy more roles with the command \`w!custom buy <role>\`.`)
    let i = 0
    await players.get(message.author.id+".custom").forEach(role => {
      embed.fields[i].name = "\u200b"
      embed.fields[i].value += `${fn.getEmoji(client, role)}`
      if(embed.fields[i].value.length > 900){
        i++
        embed.fields.push({name: "\u200b", value: "\u200b"})
      }
    })
    console.log(embed.fields)
    message.channel.send(embed)
  }
}