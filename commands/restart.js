const db = require("quick.db"),
      cmd = require("node-cmd"),
      temp = new db.table("temp"),
      fn = require('/app/util/fn')

module.exports = {
	name: "restart",
	usage: "restart",
	description: "Restart the bot!",
	run: async (client, message, args, shared) => {
    if (!["336389636878368770","658481926213992498","524188548815912999","439223656200273932"].includes(message.author.id)) return;
    if(message.channel.id != message.author.id) temp.set("rebootchan", message.channel.id)
    await message.channel.send("Rebooting bot, please wait...")
    fn.sleep(2000)
    client.user.setStatus('offline')
    cmd.run("refresh")
	}
}