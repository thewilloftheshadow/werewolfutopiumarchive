const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require("/app/util/fn")

module.exports = {
  name: "eventdrop",
  aliases: [],
  run: async (client, message, args) => {
    if (
      !client.guilds.cache
        .get("522638136635817986")
        .members.cache.get(message.author.id)
        .roles.cache.find(r =>
          [
            "*",
            "Moderator",
            "Bot Helper",
            "Developer"
          ].includes(r.name)
        )
    )
      return undefined
    
    let m = await message.channel.send(fn.event())
    await fn.sleep(5000)
    await m.edit(`||Bruh why are you looking here, the drop expired ${fn.getEmoji(client, "Harold")}||\nThe event drop has expired!`)
  }
}
