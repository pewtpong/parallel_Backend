const Koa = require('koa');
const json = require('koa-json');
const Router = require('koa-router');
const logger = require('koa-logger');
const socketIo = require('socket.io');
const port = 3000;
const render = require('koa-ejs');
const path = require('path');
//const jwt = require('jsonwebtoken');

const app = new Koa();

//  TRUST PROXY
app.proxy = true;

app.use(json());
app.use(logger());

//  SESSIONS
const session = require('koa-session');
app.keys = ['your-session-secret'];
app.use(session({},app));

//  BODY PARSER
const bodyParser = require('koa-bodyparser');
app.use(bodyParser());

//  AUTHENCATION
require('./components/auth');
const passport = require('koa-passport');
app.use(passport.initialize());
app.use(passport.session());

//  ROUTER
const router =  new Router();
app.use(router.routes());
app.use(router.allowedMethods());

// MONGO
require('./src/database');
//const mongoConnect = require('./src/database');
//mongoConnect._connect();

render(app, {
    root: path.join(__dirname, 'view'),
    layout: false,
    viewExt: 'html',
    cache: false,
    debug: false
  });


app.use(async (ctx,next) => {
    try{
       //await ctx.render('index');
       await next();
    }catch(err){
        ctx.status = err.status || 500;
        ctx.body = err.message;
        ctx.app.emit('Error',err,ctx);
    }
});

//Home
router.get('/',async (ctx,next) => {
       await ctx.render('index');
       //await next();
    
});

//const testRoute = require('./routes/test');
const registerRoute = require('./routes/register');
const loginRoute = require('./routes/login');
//onst authRoute = require('./components/auth');
const homeRoute = require('./routes/home')
//const authRoute = require('./components/auth');
//authRoute({router});
homeRoute({router});
//testRoute({router});
registerRoute({router});
loginRoute({router});

http = app.listen(port, () => console.log('Server Started'));
io = socketIo.listen(http);

// Socket
const authenticated = require('./middleware/authenticated');
const usersModel = require('./models/users');
const roomsModel = require('./models/chatRooms');
var socketioJwt = require('socketio-jwt');

io.use(socketioJwt.authorize({
    secret: process.env.JWT_SECRET || 'secret',
    handshake: true,
    callback: false
}));

io.on('connection', async (client)=>{
    //console.log(client.handshake.query);
    //console.log("User is connected", client.id);
    console.log(client.decoded_token);
    let userData;
    let currentRoom;
    await usersModel.find({
        username : client.decoded_token
    })
    .then(async (doc) => {
        console.log(doc[0]);
        userData = doc[0];
        //if(userData.chatRooms)
        client.emit('chatRooms',userData.chatRooms);
    })
    //let user = client.decoded_token;
    console.log('hello! ', client.decoded_token);
    
    client.on('status added',(status) =>{
        let jsonData = JSON.parse(status)
        console.log(jsonData.uname)
        io.emit("refresh feed", jsonData.msg)
    });
    client.on('room',async (roomId) => {
        await roomsModel.find({
            _id : roomId
        })
        .then((doc) => {
            console.log(doc[0]);
            currentRoom = doc[0];
            client.emit('chat',currentRoom);
        })
    });
    client.on('createGroup',async (groupName) =>{
        //console.log(groupName);
        let temp = await new roomsModel({
            chatName : groupName,
            member : [userData.username],
            chatType : "g"
        });
        await temp.save().then(async(doc) =>{
            console.log(doc);
            cid = doc._id;
            let chatTemp = {
                chatName : doc.chatName,
                cid : doc._id
            };
            await usersModel.findOneAndUpdate({
                username : userData.username
            },{ 
                $push: {chatRooms: chatTemp}
            }).then(( )=>{
                client.emit('chatRooms',userData.chatRooms);
            })
        }).catch(err => {
            console.error(err);
        });
    });
    //client.on('register',handlerRegister);
    //client.on('join',handlerJoin);
    //client.on('leave',handlerLeave);
    //client.on('message',handlerMessage);
    
    //client.on('availableUsers',handlerGetAvailableUsers);
    client.on('disconnect',()=>{
        console.log("client diconnected", client.id )
    });
    //client.on('error',(err) => {
    //    console.log("received error from client:", client.id)
     //   console.log(err);
    //});
});


module.exports = io;