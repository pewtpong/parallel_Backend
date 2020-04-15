const Koa = require("koa");
const json = require("koa-json");
const Router = require("koa-router");
const logger = require("koa-logger");
const socketIo = require("socket.io");
const port = 8000;
const render = require("koa-ejs");
const path = require("path");
const cors = require("@koa/cors");

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
		await next();
	} catch (err) {
		ctx.status = err.status || 500;
		ctx.body = err.message;
		ctx.app.emit("Error", err, ctx);
	}
});

//Home
router.get("/", async (ctx) => {
	await ctx.render("index");
});

const registerRoute = require("./routes/register");
const loginRoute = require("./routes/login");
const profileRoute = require("./routes/profile");
const homeRoute = require("./routes/home");
homeRoute({ router });
profileRoute({ router });
registerRoute({ router });
loginRoute({ router });
app.use(router.routes());
app.use(router.allowedMethods());
http = app.listen(port, () => console.log("Server Started"));
io = socketIo.listen(http);


const usersModel = require("./models/users");
const roomsModel = require("./models/chatRooms");
let socketioJwt = require("socketio-jwt");
let mongoose = require("mongoose");

io.use(
	socketioJwt.authorize({
		secret: process.env.JWT_SECRET || "secret",
		handshake: true,
		callback: false,
	})
);

io.on("connection", async (socket) => {
	let userData;
	let currentRoom = "";
	let clients;
	clients = Object.keys(io.engine.clients);
	await usersModel
		.find({
			username: socket.decoded_token,
		})
		.then(async (doc) => {
			userData = doc[0];
			socket.emit("isAuth", userData);
			socket.emit("chatRooms", userData.chatRooms);
			socket.emit("friendList", userData.friends);
			socket.to(userData.sid).emit("forceDisconnect");
		});
	await usersModel.findOneAndUpdate(
		{
			username: userData.username,
		},
		{
			sid: socket.id,
		},
		{
			upsert: true,
		}
	);
	// USER'S DEPENDENCY
	socket.on("addFriend", (msg) => {
		usersModel
			.find({
				username: msg.uname,
			})
			.then((doc) => {
				if (doc.length !== 0) {
					if (doc[0].friends.indexOf(userData.username) !== -1) {
						socket.emit("friendList", -1);
					} else if (msg.username === userData.username) {
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
		roomsModel
			.find({
				_id: roomId,
			})
			.then((doc) => {
				socket.leave(currentRoom._id);
				currentRoom = doc[0];
				socket.join(roomId);
				socket.emit("thisRoom", currentRoom);
			});
	});
	socket.on("chat", (chat) => {
		if (chat.cid == currentRoom._id) {
			let timestamp = new Date();
			let chatResponse = {
				msg: chat.msg,
				timestamp: timestamp,
				username: chat.username,
			};
			roomsModel
				.findOneAndUpdate(
					{
						_id: currentRoom,
					},
					{
						lastestUpdate: timestamp,
						$push: {
							messages: chatResponse,
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
				owner: userData.username,
			});
			await temp
				.save()
				.then(async (doc) => {
					cid = doc._id;
					let chatTemp = {
						chatName: doc.chatName,
						cid: doc._id,
						owner: userData.username,
					};
					await usersModel
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
							socket.emit("createGroupResult", "success");
						});
				})
				.catch((err) => {
					socket.emit("createGroupResult", "error");
				});
		}
	});
	socket.on("deleteGroup", async (roomId) => {
		let group;
		roomsModel
			.find({
				_id: roomId,
			})
			.then((doc) => {
				group = doc[0];
				let id = mongoose.Types.ObjectId(roomId);
				doc[0].members.forEach((member) => {
					usersModel.findOneAndUpdate(
						{
							_id: member.uid,
						},
						{
							$pull: {
								chatRooms: {
									chatName: group.chatName,
									cid: id,
								},
							},
						}
					);
				});
				roomsModel.findOneAndDelete({
					_id: roomId,
				});
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
						if (doc[0].members[i].username === msg.username) {
							state = 1;
							break;
						}
					}
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
								if (msg.sid === userData.sid) {
									socket.emit("chatRooms", {
										state: state,
										msg: updatedUser,
									});
								} else {
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
													profilePic: uDoc.profilePic,
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
										socket.emit(
											"joinGroupResult",
											"success"
										);
									});
							});
						socket.emit("joinGroupResult", "success");
					} else {
						socket.emit("joinGroupResult", "error");
					}
				} else {
					socket.emit("joinGroupResult", "error");
				}
			});
	});
	socket.on("leaveGroup", async (msg) => {
		roomsModel
			.find({
				_id: msg.gid,
			})
			.then((doc) => {
				let state = -1;
				if (doc.length !== 0) {
					state = 0;
					for (let i = 0; i < doc[0].members.length; i++) {
						if (doc[0].members[i].username === msg.username) {
							state = 1;
							break;
						}
					}
					if (state == 1) {
						let updatedUser;
						let updatedRoom;
						usersModel
							.findOneAndUpdate(
								{
									_id: userData._id,
								},
								{
									$pull: { chatRooms: { cid: doc[0]._id } },
								}
							)
							.then((uDoc) => {
								updatedUser = uDoc;
								roomsModel
									.findOneAndUpdate(
										{
											_id: msg.gid,
										},
										{
											$pull: {
												members: { uid: uDoc._id },
											},
										}
									)
									.then((rDoc) => {
										updatedRoom = rDoc;
									});
							});
						socket.emit("leaveGroupResult", {
							status: "success",
							user: updatedUser,
							room: updatedRoom,
						});
					} else {
						socket.emit("leaveGroupResult", {
							status: "error",
						});
					}
				} else {
					socket.emit("leaveGroupResult", {
						status: "error",
					});
				}
			});
	});
});

module.exports = io;
