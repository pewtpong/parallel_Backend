const Koa = require('koa');
const json = require('koa-json');
const Router = require('koa-router');
const logger = require('koa-logger');
const jwt = require('jsonwebtoken');

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
const mongoConnect = require('./src/database');
//mongoConnect._connect();


app.use(async (ctx,next) => {
    try{
       await next();
    }catch(err){
        ctx.status = err.status || 500;
        ctx.body = err.message;
        ctx.app.emit('Error',err,ctx);
    }
});

const testRoute = require('./routes/test');
const registerRoute = require('./routes/register');
const loginRoute = require('./routes/login');
//onst authRoute = require('./components/auth');
const homeRoute = require('./routes/home')
//const authRoute = require('./components/auth');
//authRoute({router});
homeRoute({router});
testRoute({router});
registerRoute({router});
loginRoute({router});



const server = app.listen(3000, () => console.log('Server Started'));
module.exports = server;