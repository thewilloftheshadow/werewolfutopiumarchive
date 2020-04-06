const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db"),
      fs = require("fs")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles"),
      shop = require("/app/util/shop")

let commands = new Discord.Collection()
const commandFiles = fs.readdirSync('/app/commands/use').filter(file => file.endsWith('.js'))
for (const file of commandFiles) {
  const command = require(`/app/commands/use/${file}`)
  commands.set(command.name, command)
}

module.exports = {
  name: "use",
  run: async (client, message, args, shared) => {
    let input
    if(!["rose", "bouquet", "talisman"].includes(args[0])){
    let am = parseInt(args[args.length - 1], 10)
    if (!Number.isNaN(am)) args.pop()
    else am = 1
    input = args.join(" ")
    } else {
      input = args[0]
    }
    let item = shop[input]
    if(!item) return message.channel.send(`${fn.getEmoji(client, "red_tick")} Invalid item.`)
    let rb = players.get(message.author.id+".inventory."+item.itemid)
    if(rb < 1) return await message.channel.send(`You do not have any ${item.name}s.`)
    
    let abcde = args.slice(1).join(" ")
    const commandName = args[0].toLowerCase()
    const command = commands.get(commandName) || commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName))
    if (!command) return await message.author.send("Sorry! That item is not able to be used right now.")
    await command.run(client, message, abcde)
  }
}