const Koa = require("koa");
const json = require("koa-json");
const Router = require("koa-router");
const logger = require("koa-logger");
const socketIo = require("socket.io");
const port = 8000;
const render = require("koa-ejs");
const path = require("path");
const cors = require('@koa/cors');


const app = new Koa();

//  TRUST PROXY
app.proxy = true;

app.use(json());
app.use(logger());
app.use(cors());

//  SESSIONS
const session = require("koa-session");
app.keys = ["your-session-secret"];
app.use(session({}, app));

//  BODY PARSER
const bodyParser = require("koa-bodyparser");
app.use(bodyParser());

//  AUTHENCATION
require("./components/auth");
const passport = require("koa-passport");
app.use(passport.initialize());
app.use(passport.session());

//  ROUTER
const router = new Router();

// MONGO
require("./src/database");


render(app, {
	root: path.join(__dirname, "view"),
	layout: false,
	viewExt: "html",
	cache: false,
	debug: false,
});

app.use(async (ctx, next) => {
	try {
		//await ctx.render('index');
		await next();
	} catch (err) {
		ctx.status = err.status || 500;
		ctx.body = err.message;
		ctx.app.emit("Error", err, ctx);
	}
});

//Home
router.get("/", async ctx => {
	await ctx.render("index");
	//await next();
});

//const testRoute = require('./routes/test');
const registerRoute = require("./routes/register");
const loginRoute = require("./routes/login");
const profileRoute = require("./routes/profile");
//onst authRoute = require('./components/auth');
const homeRoute = require("./routes/home");
//const authRoute = require('./components/auth');
//authRoute({router});
homeRoute({ router });
profileRoute({ router });
//testRoute({router});
registerRoute({ router });
loginRoute({ router });
app.use(router.routes());
app.use(router.allowedMethods());
http = app.listen(port, () => console.log("Server Started"));
io = socketIo.listen(http);


// Socket
//const authenticated = require("./middleware/authenticated");
//const currentClient = require("./models/currentClient");

const usersModel = require("./models/users");
const roomsModel = require("./models/chatRooms");
let socketioJwt = require("socketio-jwt");
let mongoose = require('mongoose');

io.use(
	socketioJwt.authorize({
		secret: process.env.JWT_SECRET || "secret",
		handshake: true,
		callback: false,
	})
);

io.on("connection", async (socket) => {
	//console.log(socket.decoded_token);
	let userData;
	let currentRoom ="";
	let clients;
	//clients = io.sockets.clients("5e88c8fa9b135f3f88ea4296");
	clients = Object.keys(io.engine.clients);
	console.log(socket.id);
	await usersModel
		.find({
			username: socket.decoded_token,
		})
		.then(async (doc) => {
			//console.log(doc[0]);
			userData = doc[0];
			socket.emit("isAuth", userData);
			socket.emit("chatRooms", userData.chatRooms);
			socket.emit("friendList", userData.friends);
			socket.to(userData.sid).emit("forceDisconnect");
		});
	await usersModel
		.findOneAndUpdate(
			{
				username: userData.username,
			},
			{
				sid: socket.id,
			},
			{
				upsert: true,
			}
		)
		.then((sDoc) => {
			console.log(sDoc[0]);
		});
	/*await currentClient
		.find({
			uid: userData._id,
		})
		.then((doc) => {
			if (doc.length != 0) {
				//console.log(doc);
				socket.to(doc[0].sid).emit("forceDisconnect");
			}
		});*/
	/*await currentClient.findOneAndUpdate(
		{
			uid: userData.id,
		},
		{
			$set: {
				sid: socket.id,
			},
		},
		{
			upsert: true,
		}
	);*/
	// USER'S DEPENDENCY
	socket.on("addFriend", (msg) => {
		usersModel
			.find({
				username: msg.uname,
			})
			.then((doc) => {
				if (doc.length !== 0) {
					console.log(doc[0].friends);
					if (doc[0].friends.indexOf(userData.username) !== -1) {
						socket.emit("friendList", -1);
					}else if(msg.username === userData.username ){
						socket.emit("friendList", -2);
					} else {
						usersModel
							.findOneAndUpdate(
								{
									username: msg.uname,
								},
								{
									$addToSet: {
										friends: userData.username,
									},
								}
							)
							.then((doc) => {
								console.log(doc)
								let fTemp = doc.friends;
								fTemp.push(userData.username);
								io.to(doc.sid).emit("friendList", fTemp);
							});
						usersModel
							.findOneAndUpdate(
								{
									username: userData.username,
								},
								{
									$push: {
										friends: msg.uname,
									},
								}
							)
							.then(() => {
								userData.friends.push(msg.uname);
								socket.emit("friendList", userData.friends);
							});
					}
				} else {
					socket.emit("friendList");
				}
			});
	});
	// ROOM
	socket.on("room", (roomId) => {
		console.log(roomId);
		roomsModel
			.find({
				_id: roomId,
			})
			.then((doc) => {
				socket.leave(currentRoom._id);
				currentRoom = doc[0];
				socket.join(roomId);
				socket.emit("thisRoom", currentRoom);
				console.log(currentRoom);
			});
	});
	socket.on("chat", (chat) => {
		if (chat.cid == currentRoom._id) {
			//console.log(currentRoom._id);
			let timestamp = new Date();
			let chatResponse = {
				msg:chat.msg,
				timestamp: timestamp,
				username: chat.username
			}
			 roomsModel
				.findOneAndUpdate(
					{
						_id: currentRoom,
					},
					{
						lastestUpdate: timestamp,
						$push: { 
							messages: chatResponse
						 },
					}
				)
				.then(() => {
					io.to(currentRoom._id).emit("updateRoom", chatResponse);
				});
		}
	});
	// GROUP
	socket.on("createGroup", async (groupName) => {
		console.log(groupName);
		if (groupName != "") {
			let temp = await new roomsModel({
				chatName: groupName,
				members: [
					{
						uid: userData._id,
						username: userData.username,
						profilePic: userData.profilePic,
					},
				],
				chatType: "g",
				lastestUpdate: new Date(),
			});
			await temp
				.save()
				.then(async (doc) => {
					//console.log(doc);
					cid = doc._id;
					let chatTemp = {
						chatName: doc.chatName,
						cid: doc._id,
					};
					usersModel
						.findOneAndUpdate(
							{
								_id: userData._id,
							},
							{
								$push: { chatRooms: chatTemp },
							}
						)
						.then(() => {
							userData.chatRooms.push(chatTemp);
							console.log(userData.chatRooms);
							socket.emit("chatRooms", userData.chatRooms);
							//console.log(userData.chatRooms);
						});
				})
				.catch((err) => {
					console.error(err);
				});
		}
	});
	socket.on("deleteGroup", async (roomId) => {
		console.log(roomId)
		let group;
		//let members;
		roomsModel
			.find({
				_id: roomId,
			})
			.then((doc) => {
				//console.log(doc);
				group = doc[0];
				let id = mongoose.Types.ObjectId(roomId);
				//console.log(doc[0].members)
				doc[0].members.forEach((member) => {
					
					console.log(group.chatName);
					usersModel.findOneAndUpdate(
						{
							_id: member.uid,
						},
						{
							$pull: { chatRooms: {chatName:group.chatName,cid:id } },
						}
					).then( doc => {
						console.log("OBJ: ")
						console.log(doc)
					})
				});
				roomsModel.findOneAndDelete({
					_id: roomId,
				}).then( doc =>{
					//console.log(doc)
				})
			})
			.then(() => {
				socket.emit("deleteGroupSuccess", userData.chatRooms);
			});
	});
	socket.on("joinGroup", async (msg) => {
		roomsModel
			.find({
				_id: msg.gid,
			})
			.then((doc) => {
				let state = -1;
				if (doc.length !== 0) {
					state = 0;
					for (let i = 0; i < doc[0].members.length; i++) {
						//console.log(doc[0].members[i].username, msg.username);
						if (doc[0].members[i].username === msg.username) {
							state = 1;
							break;
						}
					}
					//console.log(state);
					if (state == 0) {
						let updatedUser;
						let updatedRoom;
						usersModel
							.findOneAndUpdate(
								{
									_id: userData._id,
								},
								{
									$push: {
										chatRooms: {
											chatName: doc[0].chatName,
											cid: doc[0]._id,
										},
									},
								}
							)
							.then((uDoc) => {
								updatedUser = uDoc;
								 updatedUser.chatRooms.push({
									chatName: doc[0].chatName,
									cid: doc[0]._id,
								});
								console.log({
									state: state,
									msg: updatedUser,
								})
								console.log(uDoc.sid);
								console.log(userData.sid);
								if(msg.sid === userData.sid){
									console.log(userData.sid);
									socket.emit("chatRooms", {
										state: state,
										msg: updatedUser,
									});
								}else{
									socket.to(uDoc.sid).emit("chatRooms", {
										state: state,
										msg: updatedUser,
									});

								}
								 
								roomsModel
									.findOneAndUpdate(
										{
											_id: msg.gid,
										},
										{
											lastestUpdate: new Date(),
											$push: {
												members: {
													uid: uDoc._id,
													username: uDoc.username,
													profilePic:
														uDoc.profilePic,
												},
											},
										}
									)
									.then((rDoc) => {
										updatedRoom = rDoc;
										updatedRoom.members.push({
											uid: userData._id,
											username: userData.username,
											profilePic: userData.profilePic,
										});
										// socket.to(msg.gid).emit("thisRoom", {
										// 	state: state,
										// 	msg: updatedRoom,
										// });
										socket.emit("joinGroupResult", "success");
										console.log({
											state: state,
											msg: updatedRoom,
										});
									});
							});
					} else {
						socket.emit("joinGroupResult", "error");
					}
				}
			});
	});
	/*
	socket.on("joinGroup", async (roomId) => {
		roomsModel.findOneAndUpdate(
			{
				_id: roomId,
			},
			{
				$push: { members: userData._id },
			}
		);
		usersModel.findOneAndUpdate(
			{
				_id: userData._id,
			},
			{
				$push: { chatRooms: roomId },
			}
		);
		await socket.emit("chatRooms", userData.chatRooms);
	});*/

	//client.on('register',handlerRegister);
	//client.on('join',handlerJoin);
	//client.on('leave',handlerLeave);
	//client.on('message',handlerMessage);

	//client.on('availableUsers',handlerGetAvailableUsers);
	socket.on("disconnect", () => {
		console.log("client diconnected", socket.id);
	});
	//client.on('error',(err) => {
	//    console.log("received error from client:", client.id)
	//   console.log(err);
	//});
});

module.exports = io;
