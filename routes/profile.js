const usersModel = require("../models/users");
const bcrypt = require("../utils/bcrypt");
module.exports = ({ router }) => {
	router.patch("/api/profile", async (ctx, next) => {
		console.log(ctx);
		//let uname = ctx.request.body.username;
		//let pword;
    })
};