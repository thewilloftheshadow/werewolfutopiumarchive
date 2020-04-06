const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles"),
      shop = require("/app/util/shop")

module.exports = {
  name: "buy",
  aliases: ["purchase"],
  run: async (client, message, args) => {
    let m = await message.channel.send("** **")
    let am = parseInt(args[args.length - 1], 10)
    if (!Number.isNaN(am)) args.pop()
    else am = 1
    
    let item = shop[args.join(" ")],
        player = players.get(message.author.id)
    if (!item)
      return await m.edit(new Discord.MessageEmbed().setDescription(`${fn.getEmoji(client, "red_tick")} Invalid item`))
    
    if (item.unavaliable && ![ "336389636878368770", "439223656200273932" ].includes(message.author.id))
      return await m.edit(new Discord.MessageEmbed().setDescription(`${fn.getEmoji(client, "red_tick")} That item is currently unavaliable to purchase`))
    
    if (item.name === "Custom Maker" && players.get(`${message.author.id}.inventory.${item.itemid}`))
      return await m.edit(new Discord.MessageEmbed().setDescription(`${fn.getEmoji(client, "red_tick")} You already have the Custom Maker item!`))
    if (item.name === "Custom Maker" && am > 1)
      am = 1
    
    let role = null
    if(item.name === "Talisman"){
      m.edit(new Discord.MessageEmbed().setTitle("Choose a role").setDescription("What role do you want your talisman to be?").setThumbnail(fn.getEmoji(client, "Talisman").url))
      //message.channel.send("What role do you want your talisman to be?")
    let inputRole = await message.channel
      .awaitMessages(msg => msg.author.id == message.author.id, {
        time: 30 * 1000,
        max: 1,
        errors: ["time"]
      })
      .catch(() => {})

    if (!inputRole) return await m.edit(new Discord.MessageEmbed().setDescription("Timed out, please try again."))
    inputRole.first().delete()
    inputRole = inputRole.first().content.replace(/(_|\s+)/g, " ")

    role = Object.values(roles).find(
      data =>
        data.name.toLowerCase().startsWith(inputRole.toLowerCase()) ||
        (data.abbr && data.abbr.includes(inputRole.toLowerCase()))
    )
    }
    
    if (!role && item.name === "Talisman") return await m.edit(new Discord.MessageEmbed().setDescription("Unknown role, please use the buy command again."))
    

    let price = item.price * am
    let attachment = role ? (await fn.createTalisman(client, role.name)) : null
    
    if (price > player.coins)
      return await m.edit(
        new Discord.MessageEmbed()
          .setTitle("Uh oh!")
          .setDescription(
            `You have insufficent coins to purchase ${am} ${item.name}${
              am > 1 ? "'s" : ""
            }. You have ${player.coins} ${fn.getEmoji(
              client,
              "Coin"
            )}, but you need ${price} ${fn.getEmoji(client, "Coin")}.`
          )
          .setThumbnail(
            item.name === "Talisman"
              ? "attachment://" + attachment.name
            : fn.getEmoji(client, item.emoji ? item.emoji : item.name).url
          )
      )
    
    await m.delete()
    let e2 = attachment ? new Discord.MessageEmbed().attachFiles([attachment]) : new Discord.MessageEmbed()
    m = await message.channel.send(
      e2.setTitle("Confirmation")
        .setDescription(
          `Are you sure you want to purchase ${am} ${
            role ? role.name + " " : ""
          }${item.name}${am > 1 ? "s" : ""} for ${price} ${fn.getEmoji(
            client,
            "Coin"
          )}?\nYou currently have ${player.coins} ${fn.getEmoji(
            client,
            "Coin"
          )}`
        )
        .setThumbnail(
          item.name === "Talisman"
            ? "attachment://" + attachment.name
          : fn.getEmoji(client, item.emoji ? item.emoji : item.name).url+"?size=64"
        )
    )
    await m.react(fn.getEmoji(client, 'green tick'))
    await m.react(fn.getEmoji(client, 'red tick'))
    let reactions = await m.awaitReactions(
      (r, u) =>
      (r.emoji.id == fn.getEmoji(client, "green_tick").id ||
       r.emoji.id == fn.getEmoji(client, "red_tick").id) &&
      u.id == message.author.id,
      { time: 30*1000, max: 1, errors: ['time'] }
    ).catch(() => {})
    await m.reactions.removeAll()
    if (!reactions)
      return await m.edit(new Discord.MessageEmbed().setDescription("Timed out, please try again"))
    let reaction = reactions.first().emoji
    if (reaction.id == fn.getEmoji(client, "red_tick").id) return await m.edit(new Discord.MessageEmbed().setDescription("Purchase canceled"))
    
    
    if(item.itemid != "talisman") players.add(message.author.id+".inventory."+item.itemid, am)
    if(item.itemid === "talisman") players.add(message.author.id+".inventory."+item.itemid+"."+role.name, am)
    players.subtract(message.author.id+".coins", price) 
    message.channel.send(`Success! You have purchased ${am} ${role ? role.name + " " : ""}${item.name}${am > 1 ? "s" : ""}`)
    await m.edit(
      new Discord.MessageEmbed()
        .setTitle("Success!")
        .setDescription(
          `Success! You have purchased ${am} ${role ? role.name + " " : ""}${
            item.name
          }${am > 1 ? "s" : ""}`
        )
        .setThumbnail(
          item.name === "Talisman"
            ? await fn.createTalisman(client, role.name)
            : fn.getEmoji(client, item.emoji ? item.emoji : item.name).url + "?size=64"
        )
    )  
  }
}