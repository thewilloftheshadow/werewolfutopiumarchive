const Discord = require('discord.js')

const roles = require('/app/util/roles'),
      fn = require('/app/util/fn')

module.exports = {
  name: "role",
  run: async (client, message, args, shared) => {
    if (!args.length) return await message.author.send("You did not specify a role.")
    
    let targetRole = args.join(' ')
    let role = Object.entries(roles).find(([name, data]) => name.toLowerCase().startsWith(targetRole.toLowerCase()) || (data.abbr && data.abbr.includes(targetRole.toLowerCase())))
    if (!role) return await message.author.send("Unknown role.")
    role = role[0]
    let rolecmdobj = client.commands.filter((cmd) => cmd.gameroles && cmd.gameroles.includes(role)).array()
    let rolecmds = []
    rolecmdobj.forEach(cmd => {
      rolecmds.push(cmd.name)
    })
    
    let embed = new Discord.MessageEmbed()
        .setTitle(`${role}`)
        .setThumbnail(fn.getEmoji(client, role).url)
        .setDescription(`${roles[role].desc}${roles[role].aura ? `\n\nAura: ${roles[role].aura}` : ""}${roles[role].team ? `\nTeam: ${roles[role].team}` : ""}`);
    if (rolecmds.length)
      embed.addField("Action Commands", `${rolecmds.map(c => `\`w!${c}\``).join(', ')}`)
    
    await message.author.send(embed)
  }
}