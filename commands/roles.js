const Discord = require('discord.js')

const roles = require('/app/util/roles'),
      fn = require('/app/util/fn')

module.exports = {
  name: "roles",
  run: async (client, message, args, shared) => {
    //return;
    message.channel.send(`${message.author}, stahp pinging Watermelon to hurry up!`)
  }
}