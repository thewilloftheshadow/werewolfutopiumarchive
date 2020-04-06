const Discord = require('discord.js'),
      moment = require('moment'),
      db = require("quick.db"),
      fs = require("fs")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const config = require('/app/util/config'),
      fn = require('/app/util/fn'),
      roles = require('/app/util/roles'),
      tags = require('/app/util/tags')

module.exports = {
	name: "reload",
	usage: "reload <command>",
	description: "Reload a command, without restarting!",
 // category: "Bot Staff",
 // botStaffOnly: true,
	run: async (client, message, args, shared) => {
    if (!["336389636878368770","658481926213992498","524188548815912999","439223656200273932"].includes(message.author.id)) return;
    
    let command = args[0];
    let commandfile = client.commands.get(command);
    if (!commandfile) return message.author.send("Unable to find that command.");
    client.commands.delete(command);
    
    delete require.cache[require.resolve(`/app/commands/${commandfile.name}.js`)]
    
    if(command === "shop") delete require.cache[require.resolve(`/app/util/shop.js`)]
    
    let props = require(`/app/commands/${commandfile.name}`);
    console.log(`Reload: Command "${command}" loaded`);
    client.commands.set(props.name, props);    
    
    message.channel.send(`Command \`${command.toLowerCase()}\` successfully reloaded.`);
    
	}
}

