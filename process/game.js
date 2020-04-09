const Discord = require("discord.js"),
      moment = require("moment"),
      db = require("quick.db")

const games = new db.table("Games"),
      players = new db.table("Players"),
      nicknames = new db.table("Nicknames")

const fn = require("/app/util/fn"),
      roles = require("/app/util/roles"),
      tags = require("/app/util/tags")

module.exports = client => {
  setInterval(async () => {
    let QuickGames = games.get("quick")
    
    for (var game of QuickGames) {
      game = require("./inactivity")(client, game)
    }
    
    let activeGames = QuickGames.filter(g => g.currentPhase <= 1000 && g.currentPhase >= 0)
    
    for (var game of activeGames) {if (game.currentPhase === 999) {
        fn.broadcastTo(
          client,
          game.players.filter(p => !p.left),
          fn.gameEmbed(client, game)
        )

        game.currentPhase++

        client.guilds.cache
          .get("522638136635817986")
          .members.cache.filter(
            m =>
              game.players.map(p => p.id).includes(m.id) &&
              !m.roles.cache.find(r => r.name == "Player")
          )
          .forEach(m =>
            m.roles.add(fn.getRole(m.guild, "Player")).catch(() => {})
          )
      }
      if (game.currentPhase == -1 || game.currentPhase >= 999) continue;

      if (moment(game.nextPhase) <= moment())
        try {
          if (game.currentPhase % 3 == 2) {
            // LYNCHING
            game.running = "start lynch process"
            if (!game.noVoting) {
              game.running = "calculate lynch votes"
              let lynchVotes = game.players
                  .filter(player => player.alive)
                  .map(player => player.vote),
                lynchCount = []
              for (var j = 0; j < lynchVotes.length; j++) {
                if (!lynchCount[lynchVotes[j]]) lynchCount[lynchVotes[j]] = 0
                lynchCount[lynchVotes[j]] +=
                  game.players.filter(player => player.alive)[j].role == "Mayor"
                    ? 2
                    : 1
              }
              if (lynchCount.length) {
                let max = lynchCount.reduce((m, n) => Math.max(m, n))
                let lynched = [...lynchCount.keys()].filter(
                  i => lynchCount[i] === max
                )
                if (
                  lynched.length > 1 ||
                  lynchCount[lynched[0]] <
                    Math.floor(
                      game.players.filter(player => player.alive).length / 2
                    )
                ) {
                  fn.broadcastTo(
                    client,
                    game.players.filter(p => !p.left),
                    "The village cannot decide on who to lynch."
                  )
                } else {
                  lynched = lynched[0]
                  let lynchedPlayer = game.players[lynched - 1]

                  game.running = "look for lynch protectors"
                  
                  let protector = game.players.find(
                    p =>
                      p.preventLynch == lynchedPlayer.number &&
                      p.alive &&
                      p.role == "Flower Child"
                  )
                  if (!protector)
                    protector = game.players.find(
                      p =>
                        p.preventLynch == lynchedPlayer.number &&
                        p.alive &&
                        p.role == "Guardian Wolf"
                    )
                  if (protector) {
                    game.running = "preventing lynch"
                    
                    protector.abil1 -= 1

                    fn.broadcastTo(
                      client,
                      game.players.filter(p => !p.left),
                      `**${lynchedPlayer.number} ${nicknames.get(
                        lynchedPlayer.id
                      )}** cannot be lynched.`
                    )
                  } else if(lynchedPlayer.role == "Handsome Prince"){
                    game.running = "no lynch prince"
                    fn.broadcastTo(
                      client,
                      game.players.filter(p => !p.left),
                      `**${lynchedPlayer.number} ${nicknames.get(
                        lynchedPlayer.id
                      )}** has survived! They are the ${fn.getEmoji(client, "Handsome Prince")} Handsome Prince.`)
                    lynchedPlayer.roleRevealed = lynchedPlayer.role
                  } else {
                    game.running = "kill lynched player"
                    lynchedPlayer.alive = false
                    if (game.config.deathReveal)
                      lynchedPlayer.roleRevealed = lynchedPlayer.role

                    game.lastDeath = game.currentPhase
                    fn.broadcastTo(
                      client,
                      game.players.filter(p => !p.left),
                      `**${lynched} ${nicknames.get(lynchedPlayer.id)}${
                        game.config.deathReveal
                          ? ` ${fn.getEmoji(client, lynchedPlayer.role)}`
                          : ""
                      }** was lynched by the village.`
                    )
                    // lynchedPlayer.killedBy = 17

                    game = fn.death(client, game, lynchedPlayer.number)

                    // FOOL WIN CONDITIONS
                    game.running = "test for fool win condition"
                    if (lynchedPlayer.role == "Fool") {
                      game.currentPhase = 999
                      fn.broadcastTo(
                        client,
                        game.players.filter(p => !p.left),
                        new Discord.MessageEmbed()
                          .setTitle("Game has ended.")
                          .setThumbnail(fn.getEmoji(client, "Fool").url)
                          .setDescription(
                            `Fool ${lynched} ${nicknames.get(
                              lynchedPlayer.id
                            )} wins!`
                          )
                      )
                      game.running = "add fool win and xp"
                      fn.addXP(game, 
                        game.players.filter(p => p.number == lynched),
                        100
                      )
                      fn.addXP(game, game.players.filter(p => !p.left), 15)
                      fn.addWin(game, [lynched], "Solo")
                      continue
                    }

                    // HEADHuNTER WIN CONDITIONS
                    game.running = "test for headhunter win condition"
                    if (lynchedPlayer.headhunter) {
                      let headhunter =
                        game.players[lynchedPlayer.headhunter - 1]

                      if (headhunter.alive) {
                        game.currentPhase = 999
                        fn.broadcastTo(
                          client,
                          game.players.filter(p => !p.left),
                          new Discord.MessageEmbed()
                            .setTitle("Game has ended.")
                            .setThumbnail(fn.getEmoji(client, "Headhunter").url)
                            .setDescription(
                              `Headhunter **${
                                headhunter.number
                              } ${nicknames.get(headhunter.id)}** wins!`
                            )
                        )
                        game.running = "add headhunter win and xp"
                        fn.addXP(game, 
                          game.players.filter(
                            p => p.number == headhunter.number
                          ),
                          100
                        )
                        fn.addXP(game, game.players.filter(p => !p.left), 15)
                        fn.addWin(game, [headhunter.number], "Solo")
                        continue
                      }
                    }
                  }
                }
              } else
                fn.broadcastTo(
                  client,
                  game.players.filter(p => !p.left),
                  "The village cannot decide on who to lynch."
                )
            } else game.noVoting = false

            // CLEAR LYNCH PREVENTION SELECTIONS
            game.running = "clear lynch prevention seletions"
            for (var lynchProtector of game.players.filter(p =>
              ["Flower Child", "Guardian Wolf"].includes(p.role)
            ))
              lynchProtector.preventLynch = undefined
          }

          // NIGHT END
          game.running = "start end night module"
          if (game.currentPhase % 3 == 0) {
            // MEDIUM REVIVE
            game.running = "revive players for medium"
            let mediums = game.players.filter(
              p => p.role == "Medium" && p.usedAbilityTonight
            )
            for (var medium of mediums) {
              let revivedPlayer = game.players[medium.usedAbilityTonight - 1]
              fn.broadcastTo(
                client,
                game.players.filter(p => !p.left),
                `<:Medium_Revive:660667751253278730> Medium has revived **${
                  revivedPlayer.number
                } ${nicknames.get(revivedPlayer.id)}**.`
              )

              revivedPlayer.alive = true
              medium.abil1 -= 1
            }

            // RED LADY KILL
            game.running = "kill red ladies visiting evil player"
            let rls = game.players.filter(
                p =>
                  p.alive &&
                  p.role == "Red Lady" &&
                  p.usedAbilityTonight &&
                  game.players[p.usedAbilityTonight - 1].alive
              ),
              killedRLs = rls.filter(
                rl =>
                  roles[game.players[rl.usedAbilityTonight - 1].role].team !==
                  "Village"
              )
            for (var rl of rls) rl.visitedTonight = true
            for (var killedRL of killedRLs) {
              killedRL.alive = false
              killedRL.roleRevealed = "Red Lady"
              killedRL.killedBy =
                game.players[killedRL.usedAbilityTonight - 1].number
              game.lastDeath = game.currentPhase
              game = fn.death(client, game, killedRL.number)

              fn.broadcastTo(
                client,
                game.players.filter(p => !p.left),
                `<:Red_Lady_LoveLetter:674854554369785857> **${
                  killedRL.number
                } ${nicknames.get(killedRL.id)} ${fn.getEmoji(
                  client,
                  "Red Lady"
                )}** visited an evil player and died!`
              )
            }

            // PROTECTORS
            game.running = "find all protectors and assigning protection"
            let protectors = game.players.filter(
              p =>
                p.alive &&
                [
                  "Bodyguard",
                  "Doctor",
                  "Witch",
                  "Tough Guy",
                  "Beast Hunter",
                  "Jailer"
                ].includes(p.role)
            )
            for (var protector of protectors) {
              if (
                ["Bodyguard", "Doctor", "Witch", "Tough Guy"].includes(
                  protector.role
                ) &&
                protector.usedAbilityTonight
              )
                game.players[protector.usedAbilityTonight - 1].protectors.push(
                  protector.number
                )
              else if (
                protector.role == "Beast Hunter" &&
                protector.trap.status
              )
                game.players[protector.trap.player - 1].protectors.push(
                  protector.number
                )
              else if (
                protector.role == "Jailer" &&
                game.players.find(p => p.jailed && p.alive)
              )
                game.players[
                  game.players.find(p => p.jailed && p.alive).number - 1
                ].protectors.push(protector.number)
            }

            // ATTACKS
            game.running = "calculate attacks and mutes"
            let sks = game.players.filter(
              p => p.alive && p.role == "Serial Killer" && p.usedAbilityTonight
            )
            let wwVotes = game.players
                .filter(
                  player =>
                    player.alive && (roles[player.role].tag & tags.ROLE.SEEN_AS_WEREWOLF)
                )
                .map(player => player.vote),
              wwRoles = game.players
                .filter(
                  player =>
                    player.alive && (roles[player.role].tag & tags.ROLE.SEEN_AS_WEREWOLF)
                )
                .map(player => player.role),
              wwVotesCount = []
            for (var j = 0; j < wwVotes.length; j++) {
              if (!wwVotesCount[wwVotes[j]]) wwVotesCount[wwVotes[j]] = 0
              wwVotesCount[wwVotes[j]] += wwRoles[j] == "Alpha Werewolf" ? 2 : 1
            }
            let ggs = game.players.filter(
              p => p.alive && p.role == "Grumpy Grandma" && p.usedAbilityTonight
            )
            
            let wwStrength = [
              "Werewolf",
              "Junior Werewolf",
              "Nightmare Werewolf",
              "Wolf Shaman",
              "Guardian Wolf",
              "Werewolf Berserk",
              "Alpha Werewolf",
              "Wolf Seer"
            ]
            let wwByStrength = game.players.filter(
              p => p.alive && (roles[p.role].tag & tags.ROLE.SEEN_AS_WEREWOLF)
            )
            wwByStrength.sort((a, b) => {
              if (wwStrength.indexOf(a.role) > wwStrength.indexOf(b.role))
                return 1
              if (wwStrength.indexOf(a.role) < wwStrength.indexOf(b.role))
                return -1
              return 0
            })
            let weakestWW = wwByStrength.length ? game.players[wwByStrength[0].number - 1] : {}

            // SERIAL KILLER KILL
            game.running = "kill for serial killer"
            for (var sk of sks) {
              let attacked = sk.usedAbilityTonight,
                attackedPlayer = game.players[attacked - 1]

              if (
                attackedPlayer.protectors.length ||
                (attackedPlayer.role == "Red Lady" &&
                  attackedPlayer.visitedTonight)
              ) {
                fn.getUser(client, sk.id).send(
                  `**${attackedPlayer.number} ${nicknames.get(
                    attackedPlayer.id
                  )}** cannot be killed!`
                )
                if (
                  attackedPlayer.role == "Red Lady" &&
                  attackedPlayer.visitedTonight
                )
                  continue

                for (var x of attackedPlayer.protectors) {
                  game.running = "protect from serial killer attack"

                  let protector = game.players[x - 1]

                  if (protector.role == "Bodyguard") {
                    game.running = "protect from sk attack for bg"
                    protector.health -= 1
                    if (protector.health) {
                      fn.getUser(client, protector.id).send(
                        new Discord.MessageEmbed()
                          .setTitle(
                            "<:Bodyguard_Protect:660497704526282786> Attacked!"
                          )
                          .setDescription(
                            "You fought off an attack last night and survived.\n" +
                              "Next time you are attacked you will die."
                          )
                      )
                    } else {
                      game.running = "kill bg protector - attacker sk"
                      game.lastDeath = game.currentPhase
                      protector.alive = false
                      protector.killedBy = sk.number
                      if (game.config.deathReveal)
                        protector.roleRevealed = protector.role
                      fn.broadcastTo(
                        client,
                        game.players.filter(p => !p.left),
                        `The werewolves killed **${
                          protector.number
                        } ${fn.getUser(client, protector.id)}${
                          game.config.deathReveal
                            ? ` ${fn.getEmoji(client, protector.role)}`
                            : ""
                        }**.`
                      )

                      game = fn.death(client, game, protector.number)
                    }
                  } else if (protector.role == "Tough Guy") {
                    game.running = "protect from sk attack for tg"
                    protector.health = 0

                    fn.getUser(client, protector.id).send(
                      new Discord.MessageEmbed()
                        .setAuthor(
                          "Attacked!",
                          fn.getEmoji(client, "Bodyguard Protect").url
                        )
                        .setDescription(
                          `You protected **${
                            attackedPlayer.number
                          } ${nicknames.get(
                            attackedPlayer.id
                          )}** who was attacked by **${
                            sk.number
                          } ${nicknames.get(sk.id)} ${fn.getEmoji(
                            client,
                            sk.role
                          )}**.\n` +
                            "You have been wounded and will die at the end of the day."
                        )
                    )
                  } else if (protector.role == "Doctor") {
                    game.running = "protect from sk attack for doc"
                    fn.getUser(client, protector.id).send(
                      new Discord.MessageEmbed()
                        .setAuthor(
                          "Protection",
                          fn.getEmoji("Doctor_Protection").url
                        )
                        .setDescription(
                          `Your protection saved **${
                            attackedPlayer.number
                          } ${nicknames.get(attackedPlayer.id)}** last night!`
                        )
                    )
                  } else if (protector.role == "Witch") {
                    game.running = "protect from sk attack for witch"
                    protector.abil1 = 0

                    fn.getUser(client, protector.id).send(
                      new Discord.MessageEmbed()
                        .setAuthor("Elixir", fn.getEmoji("Witch Elixir").url)
                        .setDescription("Last night your potion saved a life!")
                    )
                  } else if (protector.role == "Beast Hunter") {
                    game.running = "protect from sk attack for bh"
                    protector.trap.status = -1

                    fn.getUser(client, protector.id).send(
                      new Discord.MessageEmbed()
                        .setAuthor(
                          "Trap Triggered!",
                          fn.getEmoji(client, "Beast Hunter TrapInactive").url
                        )
                        .setDescription(
                          "Your target was too string to be killed!"
                        )
                    )
                  }
                }
              } else if (attackedPlayer.role == "Bodyguard") {
                game.running = "bg self-prot from sk attack"
                attackedPlayer.health -= 1
                if (attackedPlayer.health) {
                  fn.getUser(client, attackedPlayer.id).send(
                    new Discord.MessageEmbed()
                      .setTitle(
                        fn.getEmoji(client, "Bodyguard_Protect") + " Attacked!"
                      )
                      .setDescription(
                        "You fought off an attack last night and survived.\n" +
                          "Next time you are attacked you will die."
                      )
                  )
                } else {
                  game.running = "kill bg self-prot - attacker sk"
                  game.lastDeath = game.currentPhase
                  attackedPlayer.alive = false
                  attackedPlayer.killedBy = sk.number
                  if (game.config.deathReveal)
                    attackedPlayer.roleRevealed = attackedPlayer.role
                  fn.broadcastTo(
                    client,
                    game.players.filter(p => !p.left),
                    `The serial killer stabbed **${
                      attackedPlayer.number
                    } ${fn.getUser(client, attackedPlayer.id)}${
                      game.config.deathReveal
                        ? ` ${fn.getEmoji(client, attackedPlayer.role)}`
                        : ""
                    }**.`
                  )
                  game = fn.death(client, game, attackedPlayer.number)
                }
              } else if (attackedPlayer.role == "Tough Guy") {
                game.running = "tg self-prot from sk attack"
                attackedPlayer.health = 0

                fn.getUser(client, attackedPlayer.id).send(
                  new Discord.MessageEmbed()
                    .setAuthor(
                      "Attacked!",
                      fn.getEmoji(client, "Bodyguard Protect").url
                    )
                    .setDescription(
                      `You were attacked by **${sk.number} ${nicknames.get(
                        sk.id
                      )} ${fn.getEmoji(client, sk.role)}**.\n` +
                        "You have been wounded and will die at the end of the day."
                    )
                )
              } else {
                game.running = "kill sk-attacked player"
                game.lastDeath = game.currentPhase
                attackedPlayer.alive = false
                attackedPlayer.killedBy = sk.number
                if (game.config.deathReveal)
                  attackedPlayer.roleRevealed = attackedPlayer.role
                fn.broadcastTo(
                  client,
                  game.players.filter(p => !p.left).map(p => p.id),
                  `The serial killer stabbed **${
                    attackedPlayer.number
                  } ${nicknames.get(attackedPlayer.id)}${
                    game.config.deathReveal
                      ? ` ${fn.getEmoji(client, attackedPlayer.role)}`
                      : ""
                  }**.`
                )
                game = fn.death(client, game, attackedPlayer.number)
              }
            }

            // WEREWOLVES KILL
            game.running = "calculate werewolves votes"
            if (wwVotesCount.length) {
              let max = wwVotesCount.reduce((m, n) => Math.max(m, n))
              let attacked = [...wwVotesCount.keys()].filter(
                i => wwVotesCount[i] === max
              )[0]
              let attackedPlayer = game.players[attacked - 1]

              game.running = "initiate werewolves kill"
              let wolves = game.players.filter(
                p => roles[p.role].team == "Werewolves" && !p.left
              )

              if (
                !game.players
                  .filter(p => p.alive && p.role == "Kitten Wolf")
                  .map(p => p.usedAbilityTonight)
                  .includes(attackedPlayer.number)
              ) {
                game.running = "ignore ww kill for kww conversion"
              }
              if (
                [
                  "Arsonist",
                  "Bomber",
                  "Cannibal",
                  "Corruptor",
                  "Illusionist",
                  "Serial Killer"
                ].includes(attackedPlayer.role) ||
                (attackedPlayer.role == "Red Lady" &&
                  attackedPlayer.visitedTonight && !game.frenzy)
              ) {
                game.running = "cannot kill solo or rl visiting others"
                fn.broadcastTo(
                  client,
                  wolves,
                  `**${attackedPlayer.number} ${nicknames.get(
                    attackedPlayer.id
                  )}** cannot be killed!`
                )
              } else if (attackedPlayer.protectors.length) {
                if (!game.frenzy) {
                  fn.broadcastTo(
                    client,
                    wolves,
                    `**${attackedPlayer.number} ${nicknames.get(
                      attackedPlayer.id
                    )}** cannot be killed!`
                  )
                } else {
                  game.running = "kill attacked player for frenzy"
                  game.lastDeath = game.currentPhase
                  if (attackedPlayer.role == "Cursed") {
                    game.running = "convert cursed from ww frenzy"
                    attackedPlayer.role = "Werewolf"
                    game.lastDeath = game.currentPhase
                    fn.getUser(client, attackedPlayer.id).send(
                      new Discord.MessageEmbed()
                        .setTitle(
                          "<:Fellow_Werewolf:660825937109057587> Converted!"
                        )
                        .setDescription(
                          "You have been bitten! You are a <:Werewolf:658633322439639050> Werewolf now!"
                        )
                    )
                    fn.broadcastTo(
                      client,
                      wolves,
                      `**${attackedPlayer.number} ${nicknames.get(
                        attackedPlayer.id
                      )}** is the <:Cursed:659724101258313768> Cursed and is turned into a <:Werewolf:658633322439639050> Werewolf!`
                    )
                  }
                  else {
                    attackedPlayer.alive = false
                    attackedPlayer.killedBy = wolves.filter(p => p.alive)[
                      Math.floor(
                        Math.random() * wolves.filter(p => p.alive).length
                      )
                    ].number
                    if (game.config.deathReveal)
                      attackedPlayer.roleRevealed = attackedPlayer.role
                    fn.broadcastTo(
                      client,
                      game.players.filter(p => !p.left).map(p => p.id),
                      `The werewolves killed **${
                        attackedPlayer.number
                      } ${nicknames.get(attackedPlayer.id)}${
                        game.config.deathReveal
                          ? ` ${fn.getEmoji(client, attackedPlayer.role)}`
                          : ""
                      }**.`
                    )

                    game = fn.death(client, game, attackedPlayer.number)
                  }
                }

                game.running = "protect from ww attack"
                for (var x of attackedPlayer.protectors) {
                  let protector = game.players[x - 1]

                  if (game.frenzy) {
                    game.running = "kill protector for frenzy"
                    protector.alive = false
                    protector.killedBy = wolves.filter(p => p.alive)[
                      Math.floor(
                        Math.random() * wolves.filter(p => p.alive).length
                      )
                    ].number
                    if (game.config.deathReveal)
                      protector.roleRevealed = protector.role

                    fn.broadcastTo(
                      client,
                      game.players.filter(p => !p.left),
                      `The Wolf Frenzy killed **${
                        protector.number
                      } ${nicknames.get(protector.id)}${
                        game.config.deathReveal
                          ? ` ${fn.getEmoji(client, protector.role)}`
                          : ""
                      }**.`
                    )

                    game = fn.death(client, game, protector.number)
                    continue
                  }

                  if (protector.role == "Bodyguard") {
                    game.running = "protect from ww attack for bg"
                    protector.health -= 1
                    if (protector.health) {
                      fn.getUser(client, protector.id).send(
                        new Discord.MessageEmbed()
                          .setAuthor(
                            "Attacked!",
                            fn.getEmoji(client, "Bodyguard Protect").url
                          )
                          .setDescription(
                            "You fought off an attack last night and survived.\n" +
                              "Next time you are attacked you will die."
                          )
                      )
                    } else {
                      game.running = "kill bg protector - attacker ww"
                      game.lastDeath = game.currentPhase
                      protector.alive = false
                      protector.killedBy = wolves.filter(p => p.alive)[
                        Math.floor(
                          Math.random() * wolves.filter(p => p.alive).length
                        )
                      ].number
                      if (game.config.deathReveal)
                        protector.roleRevealed = protector.role
                      fn.broadcastTo(
                        client,
                        game.players.filter(p => !p.left),
                        `The werewolves killed **${
                          protector.number
                        } ${fn.getUser(client, protector.id)}${
                          game.config.deathReveal
                            ? ` ${fn.getEmoji(client, protector.role)}`
                            : ""
                        }**.`
                      )

                      game = fn.death(client, game, protector.number)
                    }
                  } else if (protector.role == "Tough Guy" && weakestWW.alive) {
                    game.running = "protect from ww attack for tg"
                    protector.health = 0

                    fn.getUser(client, protector.id).send(
                      new Discord.MessageEmbed()
                        .setAuthor(
                          "Attacked!",
                          fn.getEmoji(client, "Bodyguard Protect").url
                        )
                        .setDescription(
                          `You protected **${
                            attackedPlayer.number
                          } ${nicknames.get(
                            attackedPlayer.id
                          )}** who was attacked by **${
                            weakestWW.number
                          } ${nicknames.get(weakestWW.id)} ${fn.getEmoji(
                            client,
                            weakestWW.role
                          )}**.\n` +
                            "You have been wounded and will die at the end of the day."
                        )
                    )
                  } else if (protector.role == "Doctor") {
                    game.running = "protect from ww attack for doc"
                    fn.getUser(client, protector.id).send(
                      new Discord.MessageEmbed()
                        .setAuthor(
                          "Protection",
                          fn.getEmoji(client, "Doctor Protect").url
                        )
                        .setDescription(
                          `Your protection saved **${
                            attackedPlayer.number
                          } ${nicknames.get(attackedPlayer.id)}** last night!`
                        )
                    )
                  } else if (protector.role == "Witch") {
                    game.running = "protect from ww attack for witch"
                    protector.abil1 = 0

                    fn.getUser(client, protector.id).send(
                      new Discord.MessageEmbed()
                        .setAuthor(
                          "Elixir",
                          fn.getEmoji(client, "Witch Elixir").url
                        )
                        .setDescription("Last night your potion saved a life!")
                    )
                  } else if (protector.role == "Beast Hunter") {
                    game.running = "kill weakest ww for bh"
                    weakestWW.alive = false
                    if (game.config.deathReveal)
                      weakestWW.roleRevealed = weakestWW.role
                    else weakestWW.roleRevealed = "Fellow Werewolf"

                    fn.broadcastTo(
                      client,
                      game.players.filter(p => !p.left),
                      `The beast hunter's trap killed **${
                        weakestWW.number
                      } ${nicknames.get(weakestWW.id)} ${
                        game.config.deathReveal
                          ? fn.getEmoji(client, weakestWW.role)
                          : fn.getEmoji(client, "Fellow Werewolf")
                      }**.`
                    )

                    game = fn.death(client, game, weakestWW.number)
                  }
                }
              } else if (attackedPlayer.role == "Cursed") {
                game.running = "convert cursed from ww attack"
                attackedPlayer.role = "Werewolf"
                game.lastDeath = game.currentPhase
                fn.getUser(client, attackedPlayer.id).send(
                  new Discord.MessageEmbed()
                    .setTitle(
                      "<:Fellow_Werewolf:660825937109057587> Converted!"
                    )
                    .setDescription(
                      "You have been bitten! You are a <:Werewolf:658633322439639050> Werewolf now!"
                    )
                )
                fn.broadcastTo(
                  client,
                  wolves,
                  `**${attackedPlayer.number} ${nicknames.get(
                    attackedPlayer.id
                  )}** is the <:Cursed:659724101258313768> Cursed and is turned into a <:Werewolf:658633322439639050> Werewolf!`
                )
              } else if (attackedPlayer.role == "Bodyguard") {
                game.running = "bg self-prot from ww attack"
                attackedPlayer.health -= 1
                if (attackedPlayer.health) {
                  fn.getUser(client, attackedPlayer.id).send(
                    new Discord.MessageEmbed()
                      .setTitle(
                        "<:Bodyguard_Protect:660497704526282786> Attacked!"
                      )
                      .setDescription(
                        "You fought off an attack last night and survived.\n" +
                          "Next time you are attacked you will die."
                      )
                  )
                } else {
                  game.running = "kill bg self-prot - attacker ww"
                  game.lastDeath = game.currentPhase
                  attackedPlayer.alive = false
                  attackedPlayer.killedBy = wolves.filter(p => p.alive)[
                    Math.floor(
                      Math.random() * wolves.filter(p => p.alive).length
                    )
                  ].number
                  if (game.config.deathReveal)
                    attackedPlayer.roleRevealed = attackedPlayer.role
                  fn.broadcastTo(
                    client,
                    game.players.filter(p => !p.left),
                    `The werewolves killed **${
                      attackedPlayer.number
                    } ${fn.getUser(client, attackedPlayer.id)}${
                      game.config.deathReveal
                        ? ` ${fn.getEmoji(client, attackedPlayer.role)}`
                        : ""
                    }**.`
                  )

                  game = fn.death(client, game, attackedPlayer.number)
                }
              } else if (attackedPlayer.role == "Amulet of Protection Holder"){
                game.running = "amulet protection from ww kill"
                fn.getUser(client, attackedPlayer.id).send(
                  new Discord.MessageEmbed()
                  .setAuthor(
                    "Attacked!",
                    fn.getEmoji(client, "Amulet of Protection Holder").url
                  )
                  .setDescription(
                    `You were attacked by the werewolves during the night, but your amulet saved you!`
                  )
                )
                fn.broadcastTo(
                  client,
                  wolves,
                  `**${attackedPlayer.number} ${nicknames.get(
                    attackedPlayer.id
                  )}** was unable to be killed last night!`
                )
                
              }else if (attackedPlayer.role == "Tough Guy" && weakestWW.alive) {
                game.running = "tg self-prot from ww attack"
                attackedPlayer.health = 0

                fn.getUser(client, attackedPlayer.id).send(
                  new Discord.MessageEmbed()
                    .setAuthor(
                      "Attacked!",
                      fn.getEmoji(client, "Bodyguard Protect").url
                    )
                    .setDescription(
                      `You were attacked by **${
                        weakestWW.number
                      } ${nicknames.get(weakestWW.id)} ${fn.getEmoji(
                        client,
                        weakestWW.role
                      )}**.\n` +
                        "You have been wounded and will die at the end of the day."
                    )
                )

                // fn.getUser(client, weakestWW.id).send(`Your target was a tough guy**.`)
              } else {
                game.running = "kill ww-attacked player"
                game.lastDeath = game.currentPhase
                attackedPlayer.alive = false
                attackedPlayer.killedBy = wolves.filter(p => p.alive)[
                  Math.floor(Math.random() * wolves.filter(p => p.alive).length)
                ].number
                if (game.config.deathReveal)
                  attackedPlayer.roleRevealed = attackedPlayer.role
                fn.broadcastTo(
                  client,
                  game.players.filter(p => !p.left).map(p => p.id),
                  `The werewolves killed **${
                    attackedPlayer.number
                  } ${nicknames.get(attackedPlayer.id)}${
                    game.config.deathReveal
                      ? ` ${fn.getEmoji(client, attackedPlayer.role)}`
                      : ""
                  }**.`
                )

                game = fn.death(client, game, attackedPlayer.number)
              }
            }

            // KITTEN CONVERSION
            game.running = "convert player for kww"
            let kwws = game.players.filter(
              p => p.role == "Kitten Wolf" && p.alive && p.usedAbilityTonight
            )
            for (var kww of kwws) {
              let attackedPlayer = game.players[kww.usedAbilityTonight - 1]
              if (!attackedPlayer.alive) continue
              if (roles[attackedPlayer.role].team == "Werewolves") continue;
              let convertRLs = (player) => {
                let rls = game.players.filter(rl => rl.role == "Red Lady" && rl.usedAbilityTonight == player.number && rl.alive)
                for (var rl of rls) {
                  if (rl.headhunter) continue;

                  game.lastDeath = game.currentPhase
                  fn.broadcastTo(
                    client,
                    game.players.filter(
                      p =>
                        !p.left && roles[p.role].tag & tags.ROLE.SEEN_AS_WEREWOLF
                    ),
                    `Kitten Wolf converted **${
                      rl.number
                    } ${nicknames.get(
                      rl.id
                    )}**. They are now a werewolf!`
                  )
                  rl.role = "Werewolf"
                  fn.getUser(client, rl.id).send(
                    `You were scratched by the kitten wolf. You are now a werewolf!` +
                      `Check out who your teammates are in \`w!game\`.`
                  )
                  convertRLs(rl)
                }
              }
              if (
                roles[attackedPlayer.role].team !== "Village" ||
                attackedPlayer.headhunter || attackedPlayer.sect || attackedPlayer.role === "Amulet of Protection Holder"
              ) {
                fn.broadcastTo(
                  client,
                  game.players.filter(
                    p =>
                      !p.left && roles[p.role].tag & tags.ROLE.SEEN_AS_WEREWOLF
                  ),
                  `Kitten Wolf tried to convert **${
                    attackedPlayer.number
                  } ${nicknames.get(attackedPlayer.id)}**!` +
                    ` They were either not a villager, protected or a Headhunter's target.`
                )
              }
              else if (attackedPlayer.protectors.length) {
                if (attackedPlayer.protectors.find()) fn.broadcastTo(
                  client, game.players.filter(p => !p.left && (roles[p.role].tag & tags.ROLE.SEEN_AS_WEREWOLF)),
                  `Kitten Wolf tried to convert **${attackedPlayer.number} ${nicknames.get(attackedPlayer.id)}**!` +
                  ` They were either not a villager, they were protected or they are the Headhunter's target.`
                )

                for (var x of attackedPlayer.protectors) {
                  let protector = game.players[x-1]

                  if (protector.role == "Doctor") {
                    fn.getUser(client, protector.id).send(
                      new Discord.MessageEmbed()
                        .setAuthor("Protection", fn.getEmoji(client, "Doctor Protect").url)
                        .setDescription(
                          `Your protection saved **${attackedPlayer.number} ${nicknames.get(attackedPlayer.id)}** last night!`
                        )
                    )
                  }
                  else if (protector.role == "Bodyguard" || protector.role == "Tough Guy") {
                    game.lastDeath = game.currentPhase
                    fn.broadcastTo(
                      client,
                      game.players.filter(
                        p =>
                          !p.left && roles[p.role].tag & tags.ROLE.SEEN_AS_WEREWOLF
                      ),
                      `Kitten Wolf converted **${
                        attackedPlayer.number
                      } ${nicknames.get(
                        attackedPlayer.id
                      )}**. They are now a werewolf!`
                    )
                    attackedPlayer.role = "Werewolf"
                    fn.getUser(client, attackedPlayer.id).send(
                      `You were scratched by the Kitten Wolf. You are now a werewolf!` +
                        `Check out who your teammates are in \`w!game\`.`
                    )


                    convertRLs(protector)
                  }
                  else if (protector.role == "Witch") {
                    protector.abil1 = 0

                    fn.getUser(client, protector.id).send(
                      new Discord.MessageEmbed()
                        .setAuthor("Elixir", fn.getEmoji(client, "Witch Elixir").url)
                        .setDescription("Last night your potion saved a life!")
                    )
                  }
                  else if (protector.role == "Beast Hunter") {
                    kww.alive = false
                    if (game.config.deathReveal) kww.roleRevealed = kww.role
                    else kww.roleRevealed = "Fellow Werewolf"

                    fn.broadcastTo(
                      client, game.players.filter(p => !p.left),
                      `The beast hunter's trap killed **${kww.number} ${
                        nicknames.get(kww.id)
                      } ${
                        game.config.deathReveal
                          ? fn.getEmoji(client, kww.role)
                          : fn.getEmoji(client, "Fellow Werewolf")
                      }**.`
                    )

                    game = fn.death(client, game, kww.number)
                  }
                }
              }
              else {
                game.lastDeath = game.currentPhase
                fn.broadcastTo(
                  client,
                  game.players.filter(
                    p =>
                      !p.left && roles[p.role].tag & tags.ROLE.SEEN_AS_WEREWOLF
                  ),
                  `Kitten Wolf converted **${
                    attackedPlayer.number
                  } ${nicknames.get(
                    attackedPlayer.id
                  )}**. They are now a werewolf!`
                )
                attackedPlayer.role = "Werewolf"
                fn.getUser(client, attackedPlayer.id).send(
                  `You were scratched by the kitten wolf. You are now a werewolf!` +
                    `Check out who your teammates are in \`w!game\`.`
                )
                
                
                convertRLs(attackedPlayer)
              }
              kww.abil1 -= 1
            }

            // SECT CONVERSION
            game.running = "convert player for sect"
            let sl = game.players.find(p => p.role == "Sect Leader" && p.alive)
            if (sl && sl.usedAbilityTonight) {
              let sectTarget = game.players[sl.usedAbilityTonight - 1]

              if (
                sectTarget.role !== "Cursed" &&
                (roles[sectTarget.role].team == "Village" ||
                ["Fool", "Headhunter"].includes(sectTarget.role))
              ) {
                sectTarget.sect = true
                game.lastDeath = game.currentPhase
                fn.getUser(client, sectTarget.id).send(
                  new Discord.MessageEmbed()
                    .setTitle("Welcome to the Gang")
                    .setThumbnail(fn.getEmoji(client, "Sect Member").url)
                    .setDescription(
                      `You have been turned into **${sl.number} ${nicknames.get(
                        sl.id
                      )}**'s sect!'`
                    )
                    .addField(
                      "Sect Members",
                      game.players
                        .filter(p => p.sect)
                        .map(
                          p =>
                            `${p.number} ${nicknames.get(p.id)} ${fn.getEmoji(
                              client,
                              p.role
                            )}${
                              !p.alive ? ` ${fn.getEmoji(client, "Death")}` : ""
                            }`
                        )
                    )
                )

                fn.broadcastTo(
                  client,
                  game.players.filter(p => p.sect),
                  new Discord.MessageEmbed()
                    .setTitle("Welcome to the Gang")
                    .setThumbnail(fn.getEmoji(client, "Sect Member").url)
                    .setDescription(
                      `**${sectTarget.number} ${nicknames.get(
                        sectTarget.id
                      )}${sectTarget.roleRevealed ? fn.getEmoji(
                        client,
                        sectTarget.roleRevealed
                      ) : ""}** is turned into the sect!`
                    )
                    .addField(
                      "Sect Members",
                      game.players
                        .filter(p => p.sect)
                        .map(
                          p =>
                            `${p.number} ${nicknames.get(p.id)}${
                              !p.alive ? ` ${fn.getEmoji(client, "Death")}` : ""
                            }`
                        )
                    )
                )
              } else
                fn.getUser(client, sl.id).send(
                  `**${sectTarget.number} ${nicknames.get(
                    sectTarget.id
                  )}** cannot be sected!`
                )
            }

            // SPIRIT SEER RESULTS
            game.running = "give spirit seer results"
            let spzs = game.players.filter(
              p => p.alive && p.role == "Spirit Seer" && p.usedAbilityTonight && p.usedAbilityTonight.length
            )
            for (var spz of spzs) {
              let targets = spz.usedAbilityTonight.map(
                p => game.players[p.number - 1]
              )

              if (targets[0].killedTonight || targets[1].killedTonight)
                fn.getUser(client, spz.id).send(
                  new Discord.MessageEmbed()
                    .setTitle("They had an evil soul...")
                    .setThumbnail(fn.getEmoji(client, "Spirit Seer Killed").url)
                    .setDescription(
                      `**${targets[0].number} ${nicknames.get(
                        targets[0].id
                      )}** and/or **${targets[1].number} ${nicknames.get(
                        targets[1].id
                      )}** killed last night!`
                    )
                )
              else
                fn.getUser(client, spz.id).send(
                  new Discord.MessageEmbed()
                    .setTitle("Good for tonight")
                    .setThumbnail(
                      fn.getEmoji(client, "Spirit Seer NotKilled").url
                    )
                    .setDescription(
                      `Neither of **${targets[0].number} ${nicknames.get(
                        targets[0].id
                      )}** or **${targets[1].number} ${nicknames.get(
                        targets[1].id
                      )}** killed last night.`
                    )
                )
            }

            // SHERIFF RESULTS
            game.running = "give sheriff results"
            let sheriffs = game.players.filter(
              p => p.alive && p.role == "Sheriff" && p.usedAbilityTonight
            )
            for (var sheriff of sheriffs) {
              let target = game.players[sheriff.usedAbilityTonight - 1]
              if (!target.killedBy) continue;

              let one = Math.floor(Math.random() * 2) == 1
              let killedBy = game.players[target.killedBy - 1]
              let other = game.players.filter(
                p =>
                  p.alive &&
                  p.number !== killedBy.number &&
                  p.number !== sheriff.number
              )
              if (other.length) {
                let random = other[Math.floor(Math.random() * other.length)]

                fn.getUser(client, sheriff.id).send(
                  new Discord.MessageEmbed()
                    .setTitle("There was blood...")
                    .setThumbnail(fn.getEmoji(client, "Sheriff Suspect").url)
                    .setDescription(
                      one
                        ? `**${killedBy.number} ${nicknames.get(
                            killedBy.id
                          )}** or **${random.number} ${nicknames.get(
                            random.id
                          )}** killed **${target.number} ${nicknames.get(
                            target.id
                          )}** last night.`
                        : `**${random.number} ${nicknames.get(
                            random.id
                          )}** or **${killedBy.number} ${nicknames.get(
                            killedBy.id
                          )}** killed **${target.number} ${nicknames.get(
                            target.id
                          )}** last night.`
                    )
                )
              } else {
                fn.getUser(client, sheriff.id).send(
                  new Discord.MessageEmbed()
                    .setTitle("You were up for something...")
                    .setThumbnail(fn.getEmoji(client, "Sheriff Suspect").url)
                    .setDescription(
                      `**${killedBy.number} ${nicknames.get(
                        killedBy.id
                      )}** killed **${target.number} ${nicknames.get(
                        target.id
                      )}** last night.`
                    )
                )
              }
            }

            // GRUMPY GRANDMA MUTE
            game.running = "mute for gg"
            for (var gg of ggs) {
              let muted = game.players[gg.usedAbilityTonight - 1]
              if (!muted.alive) continue

              muted.mute = true
              gg.prevmute = muted.number

              fn.getUser(client, muted.id).send(
                new Discord.MessageEmbed()
                  .setAuthor(
                    "Muted!",
                    fn.getEmoji(client, "Grumpy Grandma Mute").url
                  )
                  .setThumbnail(fn.getEmoji(client, "Grumpy Grandma").url)
                  .setDescription("You cannot speak or vote today!")
              )
              fn.broadcastTo(
                client,
                game.players.filter(p => !p.left),
                `<:Grumpy_Grandma_Mute:660495619483238410> Grumpy Grandma muted **${
                  muted.number
                } ${nicknames.get(muted.id)}**!` +
                  `They cannot speak or vote today.`
              )
            }

            // CUPID LOVER
            game.running = "assign lovers for cupid"
            if (
              game.currentPhase == 1 &&
              game.players.find(p => p.role == "Cupid")
            ) {
              let cupid = game.players.find(p => p.role == "Cupid")
              if (!cupid.usedAbilityTonight) cupid.usedAbilityTonight = []
              let lovers = []
              for (var loverNumber of cupid.usedAbilityTonight) {
                let lover = game.players[loverNumber - 1]
                if (!lover.alive) {
                  let possible = game.players.filter(
                    p => p.alive && p.role != "Cupid"
                  )
                  lover =
                    game.players[
                      possible[Math.floor(Math.random() * possible.length)]
                        .number - 1
                    ]
                }
                lover.couple = true
                lovers.push(lover)
              }
              if (!lovers[0])
                lovers[0] = game.players.filter(
                  p => p.alive && p.role !== "Cupid"
                )[
                  Math.floor(
                    Math.random() *
                      game.players.filter(p => p.alive && p.role !== "Cupid")
                        .length
                  )
                ]
              if (!lovers[1])
                lovers[1] = game.players.filter(
                  p =>
                    p.alive &&
                    p.role !== "Cupid" &&
                    p.number !== lovers[0].number
                )[
                  Math.floor(
                    Math.random() *
                      game.players.filter(
                        p =>
                          p.alive &&
                          p.role !== "Cupid" &&
                          p.number !== lovers[0].number
                      ).length
                  )
                ]
              fn.getUser(client, lovers[0].id).send(
                new Discord.MessageEmbed()
                  .setTitle("Love Was When")
                  .setThumbnail(fn.getEmoji(client, "Cupid Lovers").url)
                  .setDescription(
                    `You are in love with **${lovers[1].number} ${nicknames.get(
                      lovers[1].id
                    )} ${fn.getEmoji(client, lovers[1].role)}**.` +
                      ` You will die together! ${
                        roles[lovers[0].role].team !==
                        roles[lovers[1].role].team
                          ? "You and the Cupid win if you are the last players alive apart from the Cupid."
                          : "You also win with your team."
                      }`
                  )
              )
              fn.getUser(client, lovers[1].id).send(
                new Discord.MessageEmbed()
                  .setTitle("Love Was When")
                  .setThumbnail(fn.getEmoji(client, "Cupid Lovers").url)
                  .setDescription(
                    `You are in love with **${lovers[0].number} ${nicknames.get(
                      lovers[0].id
                    )} ${fn.getEmoji(client, lovers[0].role)}**.` +
                      "You have to stay alive with them until the end of the game. If your couple dies, you die along!"
                  )
              )
            }

            // ILLUSIONIST DISGUISE
            game.running = "disguise by illu"
            let illus = game.players.filter(
              p => p.alive && p.role == "Illusionist" && p.usedAbilityTonight
            )
            for (var illu of illus) {
              let disguisedPlayer = game.players[illu.usedAbilityTonight - 1]
              if (!disguisedPlayer.alive) continue;
              if (disguisedPlayer.role == "Red Lady" && disguisedPlayer.usedAbilityTonight) continue;
              disguisedPlayer.disguised = true
              game.lastDeath = game.currentPhase
              illu.deluded.push(disguisedPlayer.number)
              fn.getUser(client, illu.id).send(
                new Discord.MessageEmbed()
                  .setTitle("Magic")
                  .setThumbnail(fn.getEmoji(client, "Illusionist Delude").url)
                  .setDescription(
                    `**${disguisedPlayer.number} ${nicknames.get(
                      disguisedPlayer.id
                    )}** has been disguised!`
                  )
              )
              let disguiseRL = (player) => {
                for (var rl of game.players.filter(p => p.role == "Red Lady" && p.usedAbilityTonight == disguisedPlayer.number)) {
                  rl.disguised = true
                  game.lastDeath = game.currentPhase
                  illu.deluded.push(rl.number)
                  fn.getUser(client, illu.id).send(
                    new Discord.MessageEmbed()
                      .setTitle("Magic")
                      .setThumbnail(fn.getEmoji(client, "Illusionist Delude").url)
                      .setDescription(
                        `**${rl.number} ${nicknames.get(
                          rl.id
                        )}** has been disguised!`
                      )
                  )
                  disguiseRL(rl)
                }
              }
              disguiseRL(disguisedPlayer)
            }

            // ARSONIST DOUSE
            game.running = "douse by arso"
            let arsos = game.players.filter(
              p =>
                p.alive &&
                p.role == "Arsonist" &&
                p.usedAbilityTonight &&
                p.usedAbilityTonight !== "ignite"
            )
            for (var arso of arsos) {
              let doused = arso.usedAbilityTonight
                .map(p => game.players[p - 1])
                .filter(p => p.alive)
              let douseRL = (player) => {
                for (var rl of game.players.filter(p => p.alive && p.role == "Red Lady" && p.usedAbilityTonight == player.number)) {
                  if (!arso.doused) arso.doused = []
                  arso.doused.push(rl.number)
                  game.lastDeath = game.currentPhase
                  fn.getUser(client, arso.id).send(
                    new Discord.MessageEmbed()
                      .setTitle("Medium Rare")
                      .setThumbnail(fn.getEmoji(client, "Arsonist Douse").url)
                      .setDescription(
                        `**${rl.number} ${nicknames.get(rl.id)}** has been doused with gasoline!`
                      )
                  )
                }
              }
              for (var dousedPlayer of doused) {
                if (!arso.doused) arso.doused = []
                if (dousedPlayer.role == "Red Lady" && dousedPlayer.usedAbilityTonight) continue;
                arso.doused.push(dousedPlayer.number)
                game.lastDeath = game.currentPhase
                fn.getUser(client, arso.id).send(
                  new Discord.MessageEmbed()
                    .setTitle("Medium Rare")
                    .setThumbnail(fn.getEmoji(client, "Arsonist Douse").url)
                    .setDescription(
                      `**${dousedPlayer.number} ${nicknames.get(
                        dousedPlayer.id
                      )}** has been doused with gasoline!`
                    )
                )
                douseRL(dousedPlayer)
              }
            }

            // ZOMBIE BITE
            game.running = "convert by zomb"
            let bitten = game.players.filter(p => p.bitten && p.alive)
            for (var bit of bitten) {
              bit.role = "Zombie"
              game.lastDeath = game.currentPhase
              fn.getUser(client, bit.id).send(
                new Discord.MessageEmbed()
                  .setTitle("Rrrrrrr")
                  .setDescription(
                    "You have been bitten by zombies and are now one of them!"
                  )
                  .setThumbnail(fn.getEmoji(client, "Zombie").url)
              )
              bit.bitten = false
            }
            let zombies = game.players.filter(
              p => p.alive && p.role == "Zombie"
            )
            fn.broadcastTo(
              client,
              zombies,
              new Discord.MessageEmbed()
                .setTitle("New FRRrrrrriends")
                .setDescription(
                  `${bitten
                    .map(b => nicknames.get(b.id))
                    .join(", ")} are now zombies!`
                )
                .setThumbnail(fn.getEmoji(client, "Zombie").url)
            )
            game.running = "bite by zomb"
            for (var zombie of zombies.filter(z => z.usedAbilityTonight)) {
              let bit = game.players[zombie.usedAbilityTonight - 1]
              bit.bitten = true
            }
            bitten = game.players.filter(p => p.bitten && p.alive)
            fn.broadcastTo(
              client,
              zombies,
              new Discord.MessageEmbed()
                .setTitle("BRAINS")
                .setDescription(
                  `${bitten
                    .map(b => nicknames.get(b.id))
                    .join(", ")} are now bitten!`
                )
                .setThumbnail(fn.getEmoji(client, "Zombie Bitten").url)
            )

            // CORRUPTOR GLITCH
            game.running = "glitch by corr"
            let corrs = game.players.filter(
              p => p.alive && p.role == "Corruptor" && p.usedAbilityTonight
            )
            for (var corr of corrs) {
              let glitched = game.players[corr.usedAbilityTonight - 1]
              if (!glitched.alive) continue;
              glitched.mute = corr.number
              corr.glitched = [glitched.number]
              fn.getUser(client, corr.id).send(
                new Discord.MessageEmbed()
                  .setTitle("Glitching")
                  .setThumbnail(fn.getEmoji(client, "Corruptor Glitch").url)
                  .setDescription(
                    `**${glitched.number} ${nicknames.get(
                      glitched.id
                    )}** has been glitched!`
                  )
              )
              fn.getUser(client, glitched.id).send(
                new Discord.MessageEmbed()
                  .setTitle("Glitched")
                  .setThumbnail(fn.getEmoji(client, "Corruptor Glitch").url)
                  .setDescription(
                    `You have been glitched by a corruptor! You cannot speak or vote today and will die at the end of the day.`
                  )
              )
                
              let corruptRLs = (player) => {
                let rls = game.players.filter(rl => rl.role == "Red Lady" && rl.usedAbilityTonight == player.number && rl.alive)
                for (var rl of rls) {
                  if (!rl.alive) continue;
                  rl.mute = corr.number
                  corr.glitched.push(rl.number)
                  fn.getUser(client, corr.id).send(
                    new Discord.MessageEmbed()
                      .setTitle("Glitching")
                      .setThumbnail(fn.getEmoji(client, "Corruptor Glitch").url)
                      .setDescription(
                        `**${rl.number} ${nicknames.get(
                          rl.id
                        )}** has been glitched!`
                      )
                  )
                  fn.getUser(client, rl.id).send(
                    new Discord.MessageEmbed()
                      .setTitle("Glitched")
                      .setThumbnail(fn.getEmoji(client, "Corruptor Glitch").url)
                      .setDescription(
                        `You have been glitched by a corruptor! You cannot speak or vote today and will die at the end of the day.`
                      )
                  )
                  corruptRLs(rl)
                }
              }
              corruptRLs(glitched)
            }

            if (game.frenzy) game.frenzy = false
            // CLEAR NIGHT SELECTIONS
            game.running = "clear night selections"
            for (var x = 0; x < game.players.length; x++) {
              game.players[x].usedAbilityTonight = false
              if (game.players[x].enchanted)
                if (game.players.find(p => p.role == "Wolf Shaman" && p.alive))
                  game.players[x].enchanted = []
                else delete game.players[x].enchanted
              if (game.players[x].jailed) game.players[x].jailed = false
              game.players[x].protectors = []
              game.players[x].killedBy = undefined
              if (game.players[x].nightmared) delete game.players[x].nightmared
            }
          }

          for (var j = 0; j < game.players.length; j++) {
            game.players[j].vote = null
            if (game.currentPhase % 3 == 2) {
              game.players[j].mute = false
              if (
                game.players[j].role == "Tough Guy" &&
                !game.players[j].health
              ) {
                game.running = "kill attacked tg"
                Object.assign(game.players[j], {
                  health: 1,
                  alive: false,
                  roleRevealed: game.players[j].role
                })

                fn.broadcastTo(
                  client,
                  game.players.filter(p => !p.left),
                  `**${game.players[j].number} ${nicknames.get(
                    game.players[j].id
                  )} ${fn.getEmoji(
                    client,
                    "Tough Guy"
                  )}** was wounded last night and has died now.`
                )
                game = fn.death(client, game, game.players[j].number)
              }
            }
          }
          
          if (game.currentPhase % 3 == 2) {
            for (var corr of game.players.filter(p => p.role == "Corruptor" && p.glitched && p.alive)) {
              for (var glitchedPlayer of corr.glitched) {
                let glitched = game.players[glitchedPlayer-1]
                if (!glitched.alive) continue;
                game.running = "kill glitched player"
                game.lastDeath = game.currentPhase
                Object.assign(glitched, {
                  alive: false,
                  roleRevealed: "Unknown"
                })

                fn.broadcastTo(
                  client, game.players.filter(p => !p.left),
                  `**${glitched.number} ${nicknames.get(
                    glitched.id
                  )} ${fn.getEmoji(
                    client, "Unknown"
                  )}** was glitched and has died now.`
                )

                game = fn.death(client, game, glitched.number, "corr")
              }
              delete corr.glitched
            }
          }

          let alive = game.players.filter(p => p.alive),
              aliveRoles = alive.map(p => p.role)
          
          game.running = "test for tie"
          if (
            game.lastDeath + 9 == game.currentPhase ||
            !alive.length ||
            (alive.length == 2 && aliveRoles.includes("Amulet of Protection Holder") &&
             roles[aliveRoles.filter(r => !r == "Amulet of Protection Holder")[0]].tag & tags.ROLE.SEEN_AS_WEREWOLF)
          ) {
            game.running = "tie end"
            game.currentPhase = 999
            fn.broadcastTo(
              client,
              game.players.filter(p => !p.left),
              new Discord.MessageEmbed()
                .setTitle("Game has ended.")
                .setThumbnail(fn.getEmoji(client, "Death").url)
                .setDescription(`It was a tie. There are no winners.`)
            )
            game.running = "give tie xp"
            fn.addXP(game, game.players.filter(p => !p.suicide), 15)
            fn.addXP(game, game.players.filter(p => !p.left), 15)
            fn.addWin(game, [])
            continue
          }

          game.running = "test for kill president win conditions"
          if (
            game.players.find(
              p => p.role == "President" && !p.alive && !p.suicide
            )
          ) {
            let president = game.players.find(p => p.role == "President")
            game.currentPhase = 999
            fn.broadcastTo(
              client,
              game.players.filter(p => !p.left),
              new Discord.MessageEmbed()
                .setTitle("Game has ended.")
                .setThumbnail(fn.getEmoji(client, "President").url)
                .setDescription(
                  `The President **${president.number} ${nicknames.get(
                    president.id
                  )}** <:President:660497498430767104> was killed! All but the villagers have won!`
                )
            )
            game.running = "give xp and win for pres win cond"
            fn.addXP(game, game.players.filter(p => p.sect && !p.suicide), 50)
            fn.addXP(game, 
              game.players.filter(
                p =>
                  (roles[p.role].team == "Werewolves" || p.role == "Zombie") &&
                  !p.suicide
              ),
              75
            )
            fn.addXP(game, 
              game.players.filter(
                p =>
                  [
                    "Headhunter",
                    "Fool",
                    "Bomber",
                    "Arsonist",
                    "Corruptor"
                  ].includes(p.role) && !p.suicide
              ),
              100
            )
            fn.addXP(game, 
              game.players.filter(p => p.role == "Sect Leader" && !p.suicide),
              70
            )
            fn.addXP(game, game.players.filter(p => p.sect && !p.suicide), 50)
            fn.addXP(game, 
              game.players.filter(p => p.role == "Serial Killer" && !p.suicide),
              250
            )
            fn.addXP(game, game.players.filter(p => !p.left), 15)
            fn.addWin(
              game,
              game.players
                .filter(p => !p.suicide && roles[p.role].team != "Village")
                .map(p => p.number)
            )
            continue;
          }

          game.running = "test for soul collector win conditions"
          if (
            alive.find(
              p =>
                p.role == "Soul Collector" &&
                p.alive &&
                game.players.filter(p => p.boxed).length >=
                  Math.round(game.players.length / 4)
            )
          ) {
            let sc = alive.find(p => p.role == "Soul Collector")
            game.currentPhase = 999
            fn.broadcastTo(
              client,
              game.players.filter(p => !p.left),
              new Discord.MessageEmbed()
                .setTitle("Game has ended.")
                .setThumbnail(fn.getEmoji(client, "Soul Collector").url)
                .setDescription(
                  `Soul Collector **${sc.number} ${nicknames.get(
                    sc.id
                  )} ${fn.getEmoji(client, sc.role)}** win!`
                )
            )
            game.running = "give xp and win for soul collector"
            fn.addXP(game, [sc], 15)
            fn.addXP(game, game.players.filter(p => !p.left), 15)
            fn.addWin(game, alive.filter(p => p.sect).map(p => p.number))
            continue
          }

          game.running = "test for couple win conditions"
          if (
            alive.filter(p => p.couple).length == 2 &&
            alive.filter(p => !p.couple && p.role !== "Cupid").length == 0
          ) {
            let lovers = alive.filter(p => p.couple)
            game.currentPhase = 999
            fn.broadcastTo(
              client,
              game.players.filter(p => !p.left),
              new Discord.MessageEmbed()
                .setTitle("Game has ended.")
                .setThumbnail(fn.getEmoji(client, "Cupid").url)
                .setDescription(
                  `The Love Couple **${lovers[0].number} ${nicknames.get(
                    lovers[0].id
                  )} ${fn.getEmoji(client, lovers[0].role)}** and **${
                    lovers[1].number
                  } ${nicknames.get(lovers[1].id)} ${fn.getEmoji(
                    client,
                    lovers[1].role
                  )}** win!`
                )
            )
            game.running = "give xp and win for couple"
            fn.addXP(game, 
              game.players.filter(
                p => p.couple || (p.role == "Cupid" && !p.suicide)
              ),
              95
            )
            fn.addXP(game, game.players.filter(p => !p.left), 15)
            fn.addWin(game, alive.filter(p => p.sect).map(p => p.number))
            continue
          }

          game.running = "test for zombie win conditions"
          if (alive.filter(p => p.role == "Zombie").length == alive.length) {
            game.currentPhase = 999
            fn.broadcastTo(
              client,
              game.players.filter(p => !p.left),
              new Discord.MessageEmbed()
                .setTitle("Game has ended.")
                .setThumbnail(fn.getEmoji(client, "Zombie").url)
                .setDescription(`The zombies wins!`)
            )
            game.running = "give xp and win for zombie"
            fn.addXP(game, 
              game.players.filter(p => p.role == "Zombie" && !p.suicide),
              75
            )
            fn.addXP(game, game.players.filter(p => !p.left), 15)
            fn.addWin(game, alive.filter(p => p.sect).map(p => p.number))
            continue
          }

          game.running = "test for sect win conditions"
          if (
            aliveRoles.includes("Sect Leader") &&
            alive.filter(p => !p.sect).length == 0
          ) {
            game.currentPhase = 999
            fn.broadcastTo(
              client,
              game.players.filter(p => !p.left),
              new Discord.MessageEmbed()
                .setTitle("Game has ended.")
                .setThumbnail(fn.getEmoji(client, "Sect Leader").url)
                .setDescription(`The sect wins!`)
            )
            game.running = "give xp and win for sect"
            fn.addXP(game, game.players.filter(p => p.sect && !p.suicide), 50)
            fn.addXP(game, 
              game.players.filter(p => p.role == "Sect Leader" && !p.suicide),
              70
            )
            fn.addXP(game, game.players.filter(p => !p.left), 15)
            fn.addWin(game, alive.filter(p => p.sect).map(p => p.number))
            continue
          }

          game.running = "test for solo killer win conditions"
          if (
            (alive.length == 1 &&
              [
                "Arsonist",
                "Bomber",
                "Cannibal",
                "Corruptor",
                "Illusionist",
                "Serial Killer"
              ].includes(aliveRoles[0])) ||
            (alive.length == 2 &&
              aliveRoles.includes("Jailer") &&
              aliveRoles.some(
                r =>
                  [
                    "Arsonist",
                    "Bomber",
                    "Cannibal",
                    "Corruptor",
                    "Illusionist",
                    "Serial Killer"
                  ].indexOf(r) >= 0
              ))
          ) {
            game.currentPhase = 999
            fn.broadcastTo(
              client,
              game.players.filter(p => !p.left),
              new Discord.MessageEmbed()
                .setTitle("Game has ended.")
                .setThumbnail(
                  fn.getEmoji(
                    client,
                    alive.find(p => roles[p.role].team == "Solo").role
                  ).url
                )
                .setDescription(
                  `${alive.find(p => roles[p.role].team == "Solo").role} **${
                    alive.find(p => roles[p.role].team == "Solo").number
                  } ` +
                    `${nicknames.get(
                      alive.find(p => roles[p.role].team == "Solo").id
                    )}** wins!`
                )
            )
            game.running = "give xp and win for solo killer"
            fn.addXP(game, [alive.find(p => roles[p.role].team == "Solo")], 250)
            fn.addXP(game, game.players.filter(p => !p.left), 15)
            fn.addWin(
              game,
              [alive.find(p => roles[p.role].team == "Solo").number],
              "Solo"
            )
            continue
          }

          game.running = "test for werewolves win conditions"
          if (
            game.players.filter(
              p => p.alive && (roles[p.role].tag & tags.ROLE.SEEN_AS_WEREWOLF)
            ).length >=
              game.players.filter(
                p => p.alive && (roles[p.role].tag & tags.ROLE.SEEN_AS_VILLAGER)
              ).length &&
            !game.players.filter(
              p =>
                p.alive &&
                (roles[p.role].tag & tags.ROLE.SOLO_KILLER)
            ).length
          ) {
            game.currentPhase = 999
            fn.broadcastTo(
              client,
              game.players.filter(p => !p.left).map(p => p.id),
              new Discord.MessageEmbed()
                .setTitle("Game has ended.")
                .setThumbnail(fn.getEmoji(client, "Werewolf").url)
                .setDescription(`The werewolves win!`)
            )
            game.running = "give xp and win for ww"
            fn.addXP(game, 
              game.players.filter(
                p => !p.suicide && roles[p.role].team == "Werewolves"
              ),
              50
            )
            fn.addXP(game, game.players.filter(p => !p.left), 15)
            fn.addWin(
              game,
              game.players
                .filter(p => !p.suicide && roles[p.role].team == "Werewolves")
                .map(p => p.number),
              "Werewolves"
            )
            continue
          }

          game.running = "test for village win conditions"
          if (
            game.players.filter(
              p => p.alive && !(roles[p.role].tag & tags.ROLE.SEEN_AS_VILLAGER)
            ).length == 0
          ) {
            game.currentPhase = 999
            fn.broadcastTo(
              client,
              game.players.filter(p => !p.left).map(p => p.id),
              new Discord.MessageEmbed()
                .setTitle("Game has ended.")
                .setThumbnail(fn.getEmoji(client, "Villager").url)
                .setDescription(`The village wins!`)
            )
            game.running = "give xp and win for village"
            fn.addXP(game, 
              game.players.filter(
                p =>
                  !p.suicide &&
                  !p.sect &&
                  (roles[p.role].team == "Village" ||
                    (p.role == "Headhunter" &&
                      !game.players.find(pl => pl.headhunter == p.number)
                        .alive))
              ),
              50
            )
            fn.addXP(game, game.players.filter(p => !p.left), 15)
            fn.addWin(
              game,
              game.players
                .filter(
                  p =>
                    !p.suicide &&
                    !p.sect &&
                    (roles[p.role].team == "Village" ||
                      (p.role == "Headhunter" &&
                        !game.players.find(pl => pl.headhunter == p.number)
                          .alive))
                )
                .map(p => p.number),
              "Village"
            )
            continue
          }

          game.running = "test for tie warning"
          if (game.lastDeath + 6 == game.currentPhase) {
            game.running = "tie warning"
            fn.broadcastTo(
              client,
              game.players.filter(p => !p.left),
              "There has been no deaths for two days. Three consecutive days without deaths will result in a tie."
            )
          }

          // fn.updateLogs(client, game)
          // game.logs = ""

          game.running = "update next phase"
          game.currentPhase++
          game.nextPhase = moment().add(
            game.currentPhase % 3 == 0
              ? game.config.nightTime || 45
              : game.currentPhase % 3 == 1
              ? game.config.dayTime || 60
              : game.config.votingTime || 45,
            "s"
          )

          game.running = "broadcast phase msg for dead"
          fn.broadcastTo(
            client,
            game.players.filter(p => !p.left && !p.alive),
            game.currentPhase % 3 == 0
              ? `Night ${Math.floor(game.currentPhase / 3) + 1} has started!`
              : game.currentPhase % 3 == 1
              ? new Discord.MessageEmbed()
                  .setTitle(
                    `Day ${Math.floor(game.currentPhase / 3) + 1} has started!`
                  )
                  .setThumbnail(fn.getEmoji(client, "Day").url)
                  .setDescription("Start discussing!")
              : !game.noVoting
              ? `Voting time has started. ${Math.floor(
                  game.players.filter(player => player.alive).length / 2
                )} votes are required to lynch a player.\nType \`w!vote [number]\` to vote against a player.`
              : "There will be no voting today!"
          )

          game.running = "broadcast phase msg for alive"
          switch (game.currentPhase % 3) {
            case 0:
              for (var player of game.players.filter(
                p =>
                  !p.left &&
                  p.alive &&
                  p.role !== "Jailer" &&
                  (!game.players.find(p => p.role == "Jailer") ||
                    (!p.jailed &&
                      game.players.find(p => p.role == "Jailer") &&
                      game.players.find(p => p.role == "Jailer").alive))
              )) {
                fn.getUser(client, player.id).send(
                  new Discord.MessageEmbed()
                    .setTitle(
                      `Night ${Math.floor(game.currentPhase / 3) +
                        1} has started!`
                    )
                    .setThumbnail(fn.getEmoji(client, "Night").url)
                    .setDescription(
                      roles[player.role].nite ||
                        player.abil1 + (player.abil2 || 0) == 0
                        ? roles[player.role].nite
                        : "Nothing to do. Go back to sleep!"
                    )
                )
              }
              break
            case 1:
              for (var player of game.players.filter(p => p.alive && !p.left)) {
                fn.getUser(client, player.id).send(
                  new Discord.MessageEmbed()
                    .setTitle(
                      `Day ${Math.floor(game.currentPhase / 3) +
                        1} has started!`
                    )
                    .setThumbnail(fn.getEmoji(client, "Day").url)
                    .setDescription(
                      `Start discussing!\n${roles[player.role].day || ""}`
                    )
                )
              }
              break
            case 2:
              if (!game.noVoting)
                fn.broadcastTo(
                  client,
                  game.players.filter(p => p.alive && !p.left),
                  new Discord.MessageEmbed()
                    .setTitle(`Voting time has started!`)
                    .setThumbnail(fn.getEmoji(client, "Voting").url)
                    .setDescription(
                      `${Math.floor(
                        game.players.filter(player => player.alive).length / 2
                      )} votes are required to lynch a player.\nType \`w!vote [number]\` to vote against a player.`
                    )
                )
              else
                fn.broadcastTo(
                  client,
                  game.players.filter(p => p.alive && !p.left),
                  new Discord.MessageEmbed()
                    .setTitle("Peace For Today")
                    .setThumbnail(fn.getEmoji(client, "Pacifist Reveal").url)
                    .setDescription(`There is no voting today! ✌`)
                )
              break
          }

          // game.logs[game.currentPhase] = ""

          if (game.currentPhase % 3 == 0) {
            game.running = "give nightmares"
            let nmwws = game.players.filter(
              p => p.role == "Nightmare Werewolf" && p.alive && p.nmtarget
            )
            for (var nmww of nmwws) {
              let nmtarget = game.players[nmww.nmtarget - 1]
              if (!nmtarget.alive) continue
              nmtarget.nightmared = true
              fn.getUser(client, nmtarget.id).send(
                new Discord.MessageEmbed()
                  .setThumbnail(fn.getEmoji(client, "Nightmare"))
                  .setTitle("Nightmared!")
                  .setDescription(
                    "You have been nightmared and cannot use your abilities tonight!\nGo to sleep!"
                  )
              )
              fn.broadcastTo(
                client,
                game.players.filter(
                  p => roles[p.role].tag & tags.ROLE.SEEN_AS_WEREWOLF && !p.left
                ),
                new Discord.MessageEmbed()
                  .setThumbnail(fn.getEmoji(client, "Nightmare"))
                  .setTitle("Nightmared!")
                  .setDescription(
                    `**${nmtarget.number} ${nicknames.get(
                      nmtarget.id
                    )}** has been nightmared and cannot use their abilities!`
                  )
              )
            }

            if (game.players.find(p => p.role == "Jailer")) {
              game.running = "jail player"
              let jailer = game.players.find(p => p.role == "Jailer")

              if (game.players.find(p => p.jailed && p.alive && !p.left)) {
                let jailed = game.players.find(p => p.jailed && p.alive && !p.left)

                if (jailer.alive) {
                  if (
                    roles[jailed.role].team == "Werewolves" &&
                    jailed.role !== "Sorcerer"
                  )
                    fn.broadcastTo(
                      client,
                      game.players
                        .filter(
                          p =>
                            !p.left &&
                            roles[p.role].team == "Werewolves" &&
                            p.role !== "Sorcerer" &&
                            p.id !== jailed.id
                        )
                        .map(p => p.id),
                      new Discord.MessageEmbed()
                        .setTitle(`Jailed!`)
                        .setThumbnail(fn.getEmoji(client, "Jail").url)
                        .setDescription(
                          `Fellow Werewolf **${jailed.number} ${nicknames.get(
                            jailed.id
                          )}** is jailed!`
                        )
                    )

                  fn.getUser(client, jailer.id).send(
                    new Discord.MessageEmbed()
                      .setTitle(
                        `Night ${Math.floor(game.currentPhase / 3) +
                          1} has started!`
                      )
                      .setThumbnail(fn.getEmoji(client, "Jail Night").url)
                      .setDescription(
                        `**${jailed.number} ${nicknames.get(
                          jailed.id
                        )}** is now jailed!\nYou can talk to them or shoot them (\`w!execute\`).`
                      )
                  )

                  fn.getUser(client, jailed.id).send(
                    new Discord.MessageEmbed()
                      .setTitle(
                        `Night ${Math.floor(game.currentPhase / 3) +
                          1} has started!`
                      )
                      .setThumbnail(fn.getEmoji(client, "Jail Night").url)
                      .setDescription(
                        `You are now jailed.\nYou can talk to the jailer to prove your innocence.`
                      )
                  )
                } else game.players[jailed.number - 1].jailed = false
              } else if (jailer.alive) {
                fn.getUser(client, jailer.id).send(
                  new Discord.MessageEmbed()
                    .setTitle(
                      `Night ${Math.floor(game.currentPhase / 3) +
                        1} has started!`
                    )
                    .setThumbnail(fn.getEmoji(client, "Night").url)
                    .setDescription(
                      "You did not select a player last day or your target could not be jailed.\n" +
                        " Go back to sleep!"
                    )
                )
              }
            }

            if (game.frenzy) {
              game.running = "announce frenzy for wolves"
              fn.broadcastTo(
                client,
                game.players.filter(
                  p =>
                    !p.left &&
                    roles[p.role].team == "Werewolves" &&
                    p.role != "Sorcerer" &&
                    !p.jailed
                ),
                new Discord.MessageEmbed()
                  .setTitle("Frenzy")
                  .setThumbnail(
                    fn.getEmoji(client, "Werewolf Berserk Frenzy").url
                  )
                  .setDescription("It's frenzy night!")
              )
            }

            game.running = "clear gunner shot status"
            for (var gunner of game.players.filter(p => p.role == "Gunner"))
              gunner.shotToday = false
          }
        } catch (error) {
          client.channels.cache.get("664285087839420416").send(
            new Discord.MessageEmbed()
              .setColor("RED")
              .setTitle(`${fn.getEmoji(client, "red_tick")} Game Terminated`)
              .setDescription(
                `${
                  game.mode == "custom"
                    ? `${game.name} [\`${game.gameID}\`]`
                    : `Game #${game.gameID}`
                } has been terminated when trying to \`${
                  game.running
                }\` due to the following reason: \`\`\`${error.stack.replace(
                  /(?:(?!\n.*?\(\/app.*?)\n.*?\(\/.*?\))+/g,
                  "\n\t..."
                )}\`\`\``
              )
          )

          game.currentPhase = 999
          // fn.addXP(game, game.players, 15)
          fn.addXP(game, game.players.filter(p => !p.left), 15)
          fn.broadcastTo(
            client,
            game.players.filter(p => !p.left),
            `${fn.getEmoji(client, "red_tick")} There is an error causing this game to be terminated.` +
              " Please contact staff members."
          )
        }
    }
    games.set("quick", QuickGames)
  }, 500)
}