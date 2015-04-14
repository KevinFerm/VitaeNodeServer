var net = require('net');
var Sequelize = require('sequelize')

var crypto = require('crypto');
var HOST = '127.0.0.1';
var PORT = 5005;
var KEY = "hejthisisforgame"
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();

var logger = require('morgan');
//routes
var routes = require('./routes/index');
var loggedin = require('./routes/loggedin');

var models = require("./models");
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Make our db accessible to our router


app.use('/', routes);
app.use('/loggedin', loggedin);
/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error:  err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});



//LAUNCHER STUFF
var sequelize = new Sequelize('db.db', null, null, {
  host: 'localhost',
  dialect: 'sqlite',

  pool: {
    max: 50,
    min: 0,
    idle: 10000
  },

  // SQLite only
  storage: 'db.db'
});
//Define database//////////////////////////////////////////////////////////////////////////////
var User = sequelize.define('users', {
  username: { type: Sequelize.STRING, unique: true },
  email: { type: Sequelize.STRING, unique: true },
  password: {
    type: Sequelize.STRING},
  salt: {
    type: Sequelize.STRING}
});

var Teams = sequelize.define('teams', {
    id:{type:Sequelize.STRING, unique:true},
    master:{type:Sequelize.STRING},
    servant:{type:Sequelize.STRING},
    game:{type:Sequelize.STRING},
    ip:{type:Sequelize.STRING},
    ping:{type:Sequelize.INTEGER}
});
var Invites = sequelize.define('invites', {
    id:{type:Sequelize.INTEGER, unique:true},
    inviter:{type:Sequelize.STRING},
    invited:{type:Sequelize.STRING}
});
var Games = sequelize.define('games', {
    id:{type:Sequelize.INTEGER, unique:true},
    teams:{type:Sequelize.STRING},
    stats:{type:Sequelize.STRING}
});
var Searching = sequelize.define('searching', {
    team:{type:Sequelize.STRING}
});
var Userlist = sequelize.define('userlist', {
    name: {type: Sequelize.STRING, unique:true},
    ip:{type:Sequelize.STRING},
    team_id:{type:Sequelize.INTEGER},
    last_updated:{type:Sequelize.TIME},
    ping:{type:Sequelize.INTEGER}
    });
    global.sequelize = sequelize;
    global.Searching = Searching;
    global.Games = Games;
    global.Invites = Invites;
    global.Teams = Teams;
    global.Userlist = Userlist;
    global.User = User;
app.use(function(req,res,next){

    next();
});
sequelize.sync();
//END Define database//////////////////////////////////////////////////////////////////////////////

module.exports = app;
function generateSalt() {
    return crypto.randomBytes(128).toString('base64');
}
function encryptPassword(password, salt) {
    if(!password) return '';
    try {
        return crypto
        .createHmac('sha512', salt)
        .update(password)
        .digest('hex');
    } catch(err) {
        return '';
    }
}
function authenticate(password, salt,hash) {
    return encryptPassword(password,salt) === hash;
}

function getUser(user) {
    return User.findAll({
        where: {
            username: user
        }
    });
}
function addToUserlist(name,ip,ping,role,team_id){
    var date = new Date();
    Userlist.sync().then(function (){
        return Userlist.create({
            name:name,
            ip:ip,
            ping:ping,
            role:role,
            team_id:team_id,
            last_updated:date.getHours()
        });
    });
}
function createUser(username,email,password) {
    var salt = generateSalt();
    User.sync().then(function () {
  // Table created
    return User.create({
        username: username,
        email: email,
        password: encryptPassword(password, salt),
        salt: salt
    });
});

}
// Create a server instance, and chain the listen function to it
// The function passed to net.createServer() becomes the event handler for the 'connection' event
// The sock object the callback function receives UNIQUE for each connection
app.listen(3000);
net.createServer(function(sock) {

    // We have a connection - a socket object is assigned to the connection automatically
    console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);

    // Add a 'data' event handler to this instance of socket
    sock.on('data', function(data) {
        var data = data.toString();

        console.log('DATA ' + sock.remoteAddress + ': ' + data);
        var cmdata = data.split(';');
        if(cmdata[0] === "login") {
            var usr = User.find({where: {username: cmdata[1]}}).then(function(project) {
                var usr = project
                //console.log(project)
                if(project){
                                console.log(project["username"])
                              if(project["username"]){
                                console.log(cmdata[2]+ project["salt"]+ project["password"])
                                if(authenticate(cmdata[2], project["salt"], project["password"]))
                                        console.log("Logged in !!")
                                        sock.write("login;true")
                                     }
                    } else if(!project) {
                            console.log("User doesn't exist, creating one...")
                                         if (createUser(cmdata[1], cmdata[1], cmdata[2])) {
                                             sock.write("login;created");
                                         } else {
                                             sock.write("login;false")
                                         }
                    }
            });
        }
        // Write the data back to the socket, the client will receive it as data from the server


    });

    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
    });

}).listen(PORT, HOST);

console.log('Server listening on ' + HOST +':'+ PORT);
