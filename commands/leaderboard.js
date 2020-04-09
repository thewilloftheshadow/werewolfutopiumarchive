const Discord = require("discord.js"),
      db = require("quick.db")

const players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require('/app/util/fn')

module.exports = {
  name: "leaderboard",
  aliases: ["lb"],
  run: async (client, message, args) => {
    if (args[0] && !["xp","roses","coins"].includes(args[0].toLowerCase()))
      return await message.channel.send("Invalid input. Accepted values: `xp`, `roses`, `coins`.")
    
    if (!args.length) args[0] = 'xp'
    
    let allPlayers = players.all().map(x => {
      if (typeof x.data == 'string') x.data = JSON.parse(x.data)
      let data = {}
      data.roses = x.data.roses
      data.coins = x.data.coins
      data.xp = x.data.xp
      data.id = x.ID
      data.nickname = nicknames.get(x.ID) || (client.users.cache.get(x.ID) ? `* ${client.users.cache.get(x.ID).username}` : "* Unknown User")
      return data
    })
    
    let sortedPlayers = allPlayers.sort((a,b) => {
      if (a[args[0].toLowerCase()] < b[args[0].toLowerCase()]) return 1
      else if (a[args[0].toLowerCase()] > b[args[0].toLowerCase()]) return -1
      if (a.wins < b.wins) return 1
      else if (a.wins > b.wins) return -1
      if (a.nickname.toLowerCase() > b.nickname.toLowerCase()) return 1
      else if (a.nickname.toLowerCase() < b.nickname.toLowerCase()) return -1
    })
    
    // message.author.send(JSON.stringify(sortedPlayers, null, 2), {code: "fix", split: true})
    
    let embeds = []
    
    for (var [i, player] of sortedPlayers.entries()) {
      if (i % 10 == 0) embeds.push(new Discord.MessageEmbed().setDescription(""))
      embeds[embeds.length - 1].description += `${
        i == 0
          ? ":first_place: "
          : i == 1
          ? ":second_place: "
          : i == 2
          ? ":third_place: "
          : `\`${i+1}\` `
      }${player.nickname}${player.id == message.author.id ? " (**you**)" : ""} [\`${player[args[0].toLowerCase()]}\`]\n`
    }
    
    for (var [i, embed] of embeds.entries()) {
      embed
        .setTitle(
          `${
            args[0].toLowerCase() == "xp"
              ? "XP"
              : `${args[0][0].toUpperCase()}${args[0].slice(1).toLowerCase()}`
          } Leaderboard (#${i * 10 + 1}-#${Math.min(
            (i + 1) * 10,
            sortedPlayers.length
          )})`
        )
        .setFooter(
          `Page ${i + 1}/${embeds.length} | Sorted in descending order by ${
            args[0].toLowerCase() == "xp"
              ? "XP"
              : args[0].toLowerCase()
          }.`
        )
    }
    
    let m = await message.channel.send(embeds[0])
    fn.paginator(message.author.id, m, embeds, 0)
    
    /*
    for(user in sortedPlayers){
      let score = lb[user]
      if(i == 0){
        embedScore[i] = "**Top Three:**\n:first_place: - "+sortedPlayers.nickname+": "+"`"+sortedPlayers.xp+"`"
      }
      if(i == 1){
        embedScore[i] = ":second_place: - "+userInfo.user.username+"#"+userInfo.user.discriminator+": "+"`"+score+"`"
      }
      if(i == 2){
        embedScore[i] = ":third_place: - "+userInfo.user.username+"#"+userInfo.user.discriminator+": "+"`"+score+"`"
      }
      if(i == 3){
        embedScore[i] = "\n**4th and below:**\n - "+userInfo.user.username+"#"+userInfo.user.discriminator+": "+"`"+score+"`"
      }
      if(i > 3){
        embedScore[i] = " - "+userInfo.user.username+"#"+userInfo.user.discriminator+": "+"`"+score+"`"
      }
      i = i + 1
    }
    if(embedScore.join("\n") == ""){
      embedScore = ["Nobody has scored any points yet."]
    }
    message.author.send(embedScore.join('\n'))
    message.author.send(JSON.stringify(lb), {code: "fix", split: {char: ","}})*/
  }
}