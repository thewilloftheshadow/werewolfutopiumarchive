const express = require("express")
const app = express()
const ejs = require("ejs")
const path = require("path")
const Strategy = require("passport-discord").Strategy
const html = require("html")
const http = require("http")
const session = require("express-session")
const passport = require("passport")
const probe = require("probe-image-size")
const cmd = require("node-cmd")

const statusMonitor = require("express-status-monitor")({
  title: "Werewolf Utopium Status",
  path: "/status",
  spans: [
    {
      interval: 1, // Every second
      retention: 60 // Keep 60 datapoints in memory
    },
    {
      interval: 5, // Every 5 seconds
      retention: 60
    },
    {
      interval: 15, // Every 15 seconds
      retention: 60
    }
  ],
  chartVisibility: {
    cpu: true,
    mem: true,
    load: false,
    responseTime: false,
    rps: false,
    statusCodes: true
  } /* ,
healthChecks: [{
  protocol: 'https',
  host: 'staff.werewolf-utopium.tk',
}] */
})

app.use(
  require("express-session")({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 3600000 //1 hour
    }
  })
)

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((obj, done) => {
  done(null, obj)
})

passport.use(
  new Strategy(
    {
      clientID: "657960787993690122",
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://werewolf-utopium.tk/auth/callback",
      scope: "identify guilds"
    },
    (accessToken, refreshToken, profile, done) => {
      process.nextTick(() => {
        done(null, profile)
        console.log("New login!", profile)
        fn.addLog(`MAIN`, `New login on werewolf-utopium.tk from ${profile.username}#${profile.discriminator} (${profile.id})`)
      })
    }
  )
)

function issueToken(user) {
  let token = fn.randomString(64)
  authdb.set("tokens." + token, user.id)
  return token
}

function useToken(token) {
  let uid = authdb.get("tokens." + token)
  authdb.delete("tokens." + token)
  return uid
}

const Discord = require("discord.js"),
  fs = require("fs"),
  moment = require("moment"),
  fetch = require("node-fetch"),
  db = require("quick.db")

const config = require("/app/util/config"),
  fn = require("/app/util/fn"),
  tags = require("/app/util/tags")

const games = new db.table("Games"),
  players = new db.table("Players"),
  nicknames = new db.table("Nicknames"),
  authdb = new db.table("authdb"),
  apidb = new db.table("api")

const roles = require("/app/util/roles")

app.use(express.static(path.join(__dirname, "/public")))
app.use(require("cookie-parser")())
app.use(require("body-parser").urlencoded({ extended: true }))
app.use(passport.initialize())
app.use(passport.session())
app.set("view engine", "ejs")

const api = require('express').Router();
app.use('/api', api);


app.use(function(req, res, next) {
  if (req.user) authdb.set(req.user.id, req.user) // Store all user info
  if (req.user && !req.cookies.rememberme) {
    //logged in but no rm cookie
    let token = issueToken(req.user)
    res.clearCookie("remember-me")
    res.cookie("rememberme", token, {
      secure: true,
      httpOnly: true,
      maxAge: 604800000
    })
  }
  if (!req.user && req.cookies.rememberme) {
    //not logged in but rm cookie
    let uid = useToken(req.cookies.rememberme)
    res.clearCookie("rememberme")
    res.clearCookie("remember-me")
    if (!uid) return next()
    req.user = authdb.get(uid)
    let token = issueToken(req.user)
    res.cookie("rememberme", token, {
      secure: true,
      httpOnly: true,
      maxAge: 604800000
    })
  }
  next()
})

module.exports = client => {
  client.on("ready", async () => {
    app.get("*", (req, res) => {
      try {
        //redirect to custom domain
        if (req.hostname.includes("werewolf-utopium.glitch.me")) {
          res.redirect("https://werewolf-utopium.tk" + req.url)
        } else {
          req.next()
        }
      } catch (e) {}
      // if (req.user) {
      //   req.user.viewLogs = false
      //   if (
      //     client.guilds.cache
      //       .get("522638136635817986")
      //       .members.cache.get(req.user.id)
      //       .roles.cache.find(r =>
      //         [
      //           "*",
      //           "βTester Helper",
      //           "Mini Moderator",
      //           "Moderator",
      //           "Bot Helper",
      //           "Developer"
      //         ].includes(r.name)
      //       )
      //   )
      //     req.user.viewLogs = true
      // }
    })

    app.get("/", (req, res) => {
      let pass = { user: null, player: null, path: req.path }
      if (req.user) {
        req.user.nickname = nicknames.get(req.user.id) || null
        pass.user = req.user
        pass.nickname = nicknames.get(req.user.id) || null
        pass.player = players.get(req.user.id)
      }
      res.render(__dirname + "/views/index.ejs", pass)
    })

    app.get("/profile", (req, res) => {
      res.redirect("/profile/" + config.defaultProfile)
    })

    app.get("/profile/:id", (req, res) => {
      let pass = { user: null, player: null, path: req.path }
      if (req.user) {
        pass.user = req.user
        pass.nickname = nicknames.get(req.user.id) || null
      }
      let id = req.params.id // from the URL
      let user = null
      if (id) {
        let user = client.users.cache.get(id)
        if (!user)
          user = fn.getUser(
            client,
            nicknames
              .all()
              .find(
                x =>
                  JSON.parse(x.data).toLowerCase() ==
                  id.toLowerCase().replace(/_/g, "\\_")
              )
              ? nicknames
                  .all()
                  .find(
                    x =>
                      JSON.parse(x.data).toLowerCase() ==
                      id.toLowerCase().replace(/_/g, "\\_")
                  ).ID
              : id
          )
        //console.log(id, user)
        if (!user) return
        let player = players.get(user.id)
        player.nickname = nicknames.get(user.id)
        player.avatar =
          "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar
        pass.player = player
        let allGamesPlayed = fn.clone(player.wins)
        allGamesPlayed.push(...player.loses)
        pass.allGamesPlayed = allGamesPlayed
      }
      res.render(__dirname + "/views/profile.ejs", pass)
    })

    app.get("/register", (req, res) => {
      res.redirect("https://discordapp.com/register")
    })

    app.get("/login", (req, res) => {
      let state = fn.randomString(64)
      authdb.set(
        "state." + state,
        req.query.return ? decodeURI(req.query.return) : "/"
      )
      res.redirect("/auth/discord?state=" + state)
    })

    app.get("/invite", (req, res) => {
      res.redirect("https://discord.gg/M62npYk")
    })

    app.get("/auth/discord", (req, res) => {
      res.redirect(
        "https://discordapp.com/oauth2/authorize?response_type=code&redirect_uri=https%3A%2F%2Fwerewolf-utopium.tk%2Fauth%2Fcallback&scope=identify%20guilds&client_id=657960787993690122&prompt=none&state=" +
          req.query.state
      )
    })

    app.get(
      "/auth/callback",
      passport.authenticate("discord", {
        failureRedirect: "/"
      }),
      (req, res) => {
        let goto = authdb.get("state." + req.query.state)
        if (goto)
          return res.redirect(goto.replace(/'/g, ""))
        res.redirect(`/`) // Successful auth
      }
    )

    app.get("/logout", (req, res) => {
      res.clearCookie("rememberme")
      req.logout()
      res.redirect("/")
    })

    app.get("/info", checkAuth, (req, res) => {
      console.log(req.user)
      if (
        [
          "336389636878368770",
          "658481926213992498",
          "439223656200273932",
          "529121242716831748"
        ].includes(req.user.id)
      ) {
        res.json(req.user)
      } else {
        res.sendStatus(200)
      }
    })

    app.get("/json.sqlite", checkAuth, devonly, async (req, res) => {
      res.sendFile("/app/json.sqlite")
    })

    app.get("/oldlog/:id", checkAuth, viewLogs, async (req, res) => {
      //if (!req.user.viewLogs) return res.redirect("/")
      let file = "/app/logs/" + req.params.id + ".log"
      if (fs.existsSync(file)) {
        res.sendFile(file)
      } else {
        res.status(404).send("No logs with that ID were found.")
      }
    })

    app.get("/logs", checkAuth, viewLogs, async (req, res) => {
      
      let pass = { user: null, player: null, path: req.path }
      if (req.user) {
        req.user.nickname = nicknames.get(req.user.id) || null
        pass.user = req.user
        pass.nickname = nicknames.get(req.user.id) || null
        pass.player = players.get(req.user.id)
      }
      let files = fs.readdirSync("/app/logs")
      files = files.filter(
        f => f.toLowerCase().endsWith(".log")
      )
      pass.files = files
      res.render(__dirname + "/views/logs.ejs", pass)
    })
    
    app.get("/log/:id", checkAuth, viewLogs, async (req, res) => {
      let files = fs.readdirSync("/app/logs")
      let file = files.find(
        f => f.toLowerCase() == `${req.params.id.toLowerCase()}.log`
      )
      if (!file) return res.status(404).send("No logs with that ID were found.")
      if (file != `${req.params.id}.log`)
        res.redirect(`/log/${file.substring(0, file.length - 4)}`)
      let fulllog = fs.readFileSync(`/app/logs/${file}`, "utf8")
      // console.log(fulllog)
      let logs = fulllog.split("\n")
      res.render(__dirname + "/views/log.ejs", {
        logs: logs,
        id: req.params.id
      })
    })

    app.get("/restart", checkAuth, devonly, async (req, res) => {
      cmd.run("refresh")
      res.sendStatus(200)
    })

    for (let role in roles) {
      roles[role].cleanname = roles[role].name.toLowerCase().replace(/\s+/g, "")
      roles[role].emoji = fn.getEmoji(client, roles[role].name).url
      let rolecmdobj = client.commands
        .filter(cmd => cmd.gameroles && cmd.gameroles.includes(role))
        .array()
      roles[role].cmds = []
      rolecmdobj.forEach(cmd => {
        roles[role].cmds.push(cmd.name)
      })

      let result = await probe(fn.getEmoji(client, roles[role].name).url).catch(
        () => {}
      )
      Object.assign(roles[role], {
        width: result ? result.width : 128,
        height: result ? result.height : 128
      })

      if (roles[role].tag) {
        let taglist = roles[role].tag
          .toString(2)
          .split("")
          .reverse()
        roles[role].tags = []
        for (var i = 0; i < taglist.length; i++) {
          if (taglist[i] == 1) {
            let tagname = Object.entries(tags.ROLE)
              .find(x => x[1] == Math.pow(2, i))[0]
              .replace(/_/g, " ")
              .toLowerCase()
            roles[role].tags.push(tagname[0].toUpperCase() + tagname.slice(1))
          }
        }
      }
    }

    app.get("/roles", async (req, res) => {
      let pass = { user: null, path: req.path }
      if (req.user) {
        pass.user = req.user
        pass.nickname = nicknames.get(req.user.id) || null
      }
      pass.roles = roles
      pass.tags = tags
      res.render(__dirname + "/views/roles.ejs", pass)
    })

    app.get("/status", checkAuth, devonly, statusMonitor.pageRoute)
    
    //Begin /api routes
    api.all('*', (req, res) => {
      if(!req.headers.wuapi) res.status(403).send("The API can only be accessed an API key. If you need assistance, contact TheShadow#8124")
      let user = apidb.get(req.headers.wuapi)
      if(!user){
        res.status(403).send("Invalid API key. If you need assistance, contact TheShadow#8124")
      } else {
        fn.addLog("API", `New API request to ${req.path} from the ${user} client.`)
        req.next()
      }
    })
    
    api.get("/clientuser", async (req, res) => {
      res.json(client.user)
    })
    
    api.get("/nickname/:userid", apiRead, async (req, res) => {
      res.json({"userid": req.params.userid, "nickname": nicknames.get(req.params.userid)})
    })
    
    api.get("/player/:userid", apiRead, async (req, res) => {
      res.json({"userid": req.params.userid, "player": players.get(req.params.userid)})
    })
    
    api.post("/addcoins/:userid", apiWrite, async (req, res) => {
      if(!req.body.amount) res.sendStatus(400)
      players.add(req.params.userid+".coins", parseInt(req.body.amount, 10))
      res.sendStatus(200)
    })
    
    api.post("/addcoins/:userid", apiWrite, async (req, res) => {
      if(!req.body.amount) res.sendStatus(400)
      players.add(req.params.userid+".roses", parseInt(req.body.amount, 10))
      res.sendStatus(200)
    })

    function apiWrite(req, res, next) {
      let writeperm = apidb.get(req.headers.wuapi+".access.write")
      if(!writeperm){
        res.status(403).send("Access denied. This API key does not have write permissions.")
        fn.addLog("API", apidb.get(req.headers.wuapi+".client")+" tried to access a write API without access.")
      } else {
        next()
      }
    }
    function apiRead(req, res, next) {
      let readperm = apidb.get(req.headers.wuapi+".access.read")
      if(!readperm){
        res.status(403).send("Access denied. This API key does not have read permissions.")
        fn.addLog("API", apidb.get(req.headers.wuapi+".client")+" tried to access a read API without access.")
      } else {
        next()
      }
    }
    function checkAuth(req, res, next) {
      if (req.user) return next()
      res.redirect("/login?return=" + encodeURI(req.path))
    }
    function devonly(req, res, next) {
      if (
        ![
          "336389636878368770",
          "658481926213992498",
          "439223656200273932",
          "529121242716831748"
        ].includes(req.user.id)
      )
        res.redirect("/")
      next()
    }
    function viewLogs(req, res, next) {
      if (
        !client.guilds.cache
          .get("522638136635817986")
          .members.cache.get(req.user.id)
          .roles.cache.find(r =>
            [
              "*",
              "βTester Helper",
              "Mini Moderator",
              "Moderator",
              "Bot Helper",
              "Developer"
            ].includes(r.name)
          )
      )
        res.redirect("/")
      next()
    }

    const listener = app.listen(process.env.PORT, function() {
      console.log(
        "werewolf-utopium.tk is online, using port " + listener.address().port
      )
      fn.addLog(`MAIN`, "werewolf-utopium.tk is online, using port " + listener.address().port)
    })
  })
}
