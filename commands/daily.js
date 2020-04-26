const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db"),
      wrg = require('weighted-random')

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn'),
      roles = require("/app/util/roles"),
      shop = require("/app/util/shop")

let numArray = (start, int, cnt) => {
  let arr = [start]
  for (var i = 1; i < cnt; i++)
    arr.push(start + int * i)
  return arr
}

module.exports = {
  name: "daily",
  aliases: ["daliy"],
  run: async (client, message, args) => {
    let player = players.get(message.author.id)
    if(!player.lastDaily) player.lastDaily = 0
    
    let guild = client.guilds.cache.get("522638136635817986")
    let booster = false
    if (
      fn.getMember(guild, message.author.id) &&
      fn.getRole(guild, "Server Booster") &&
      fn.getMember(guild, message.author.id)
        .roles.cache.has(fn.getRole(guild, "Server Booster").id)
    )
      booster = true
    
    // EXPERIMENTAL
//     let items = [
//       {
//         weight: 100 + player.streak,
//         item: "coin",
//         possibleValues: numArray(10, 10, 15)
//       },
//       {
//         weight: 50 + player.streak,
//         item: "rose",
//         possibleValues: numArray(5, 5, 10)
//       },
//       {
//         weight: 25 + player.streak,
//         item: "common lootbox",
//         possibleValues: numArray(1, 1, 5)
//       },
//       {
//         weight: 10 + player.streak,
//         item: "apprentice lootbox",
//         possibleValues: numArray(1, 1, 3)
//       },
//       {
//         weight: 10 + player.streak,
//         item: "talisman",
//         possibleValues: [3]
//       },
//       {
//         weight: 5 + player.streak,
//         item: "gem",
//         possibleValues: numArray(5, 5, 4)
//       },
//       { weight: player.streak, item: "master lootbox", possibleValues: [1] }
//     ]
//     let bonusItem = items[wrg(items.map(x => x.weight))]
//     let possibleValues = fn.deepClone(bonusItem.possibleValues)
//     let bonusItemAmt = bonusItem.possibleValues[wrg(possibleValues.reverse().map(x => Math.pow(x,2)))]
    
//     console.log(bonusItem, bonusItemAmt)
//     console.log(`You've won ${bonusItemAmt} ${bonusItem.item}s!`)
    
    if (moment(player.lastDaily).add(20, "h") >= moment()) {
      let diff = moment(player.lastDaily)
        .add(20, "h")
        .diff(moment(), "seconds")
      let diffclaim = moment()
        .diff(moment(player.lastDaily), "seconds")
      let rdmmsgs = [
        `You cannot collect daily rewards for another **${Math.floor(
          diff / 60 / 60
        ) % 24}h ${Math.floor(diff / 60) % 60}m ${diff % 60}s**.`,
        `Hmm... You need to wait for another **${Math.floor(diff / 60 / 60) %
          24}h ${Math.floor(diff / 60) % 60}m ${diff %
          60}s** to claim your next daily reward!`
      ]
      return await message.channel.send(
        Math.floor(diffclaim / 60 / 60) % 24 < 12
          ? `How is it "daily" if you claim it **${Math.floor(
              diffclaim / 60 / 60
            ) % 24}h ${Math.floor(diffclaim / 60) % 60}m ${diffclaim %
              60}s** after you last claimed?`
          : rdmmsgs[Math.floor(rdmmsgs.length * Math.random())]
      )
    }
    
    if (moment(player.lastDaily || 0).add(48, "h") <= moment())
      player.streak = 0
    
    let base = 10
    let bonus = Math.round(Math.pow(5*player.streak, 7/10))
    
    player.coins += Math.round((base + bonus) * (booster ? 1.25 : 1))
    
    player.lastDaily = moment()
    player.streak += 1
    players.set(message.author.id, player)
    await message.channel.send(
      new Discord.MessageEmbed()
        .setTitle(`Daily Reward for ${nicknames.get(message.author.id)}`)
        .setThumbnail(fn.getEmoji(client, "Daily").url)
        .setDescription(
          `You received ${base} ${fn.getEmoji(client, "Coin")}.\n` +
          (bonus ? `**${player.streak}-day streak bonus** | ${bonus} ${fn.getEmoji(client, "Coin")}\n` : "") +
          (booster ? `**Booster 25% bonus** | ${Math.round((base + bonus) * 0.25)} ${fn.getEmoji(client, "Coin")}\n` : "") +
          `You now have ${player.coins} ${fn.getEmoji(client, "Coin")}.`
        )
        .setFooter("Remember to come back and claim your daily reward tomorrow for streak bonus!")
    )
  }
}