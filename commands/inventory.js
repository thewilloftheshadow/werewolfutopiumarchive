const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require("/app/util/fn"),
      roles = require("/app/util/roles"),
      shop = require("/app/util/shop")

module.exports = {
  name: "inventory",
  aliases: ["inv"],
  run: async (client, message, args) => {
    let user
    if (!args[0]) user = message.author
    else if (message.mentions.users.size) user = message.mentions.users.first()
    if (!user && args[0]) 
      user = fn.getUser(
        client, 
        nicknames.all().find(x => JSON.parse(x.data).toLowerCase() == args[0].toLowerCase().replace(/_/g, "\\_")) ? 
        nicknames.all().find(x => JSON.parse(x.data).toLowerCase() == args[0].toLowerCase().replace(/_/g, "\\_")).ID : args[0]
      )
    if (args[0] && !user)
      return await message.channel.send(`${fn.getEmoji(client, "red_tick")} User \`${args[0]}\` not found.`)
    let p = players.get(user.id)
    let name = nicknames.get(user.id) || user.username
    let inv = p.inventory
    let embeds = [new Discord.MessageEmbed().setTitle(`Inventory for ${name}`).setDescription(" ").setColor(0x7289da)]
    
    let i = 1
    for (let invitem in inv) {
      let item = shop[invitem]
      if(item.itemid != "talisman"){
      if (i % 10 == 0) embeds.push(new Discord.MessageEmbed().setTitle(`Inventory for ${name}`).setDescription("").setColor(0x7289da))
        embeds[embeds.length - 1].description += `${fn.getEmoji(client, item.emoji ? item.emoji : item.name) ? fn.getEmoji(client, item.emoji ? item.emoji : item.name) : ""}${item.name} - ${inv[invitem]}\n`
      i += 1
      }
    }
    
    if(inv.talisman){
      let allt = ""
      for(let t in inv.talisman) allt += `${fn.getEmoji(client, t)} ${t} - ${inv.talisman[t]}\n`
      embeds[0].addField("Talismans:",allt)
    }
    
    for (var [x, embed] of embeds.entries()) {
      embed.setFooter(`Page ${x + 1}/${embeds.length} | Some items are currently unavaliable`)
    }
    
    if(embeds[0].description === " " && !inv.talisman) embeds[0].description = "No items in inventory"

    let m = await message.channel.send(embeds[0])
    fn.paginator(message.author.id, m, embeds, 0)
  }
}
