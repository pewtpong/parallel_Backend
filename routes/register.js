const usersModel = require("../models/users");
const bcrypt = require("../utils/bcrypt");
module.exports = ({ router }) => {
	router.post("/api/register", async (ctx, next) => {
		let msg;
		let uname = ctx.request.body.username;
		let pword;
		await bcrypt.hash(ctx.request.body.password).then(hash => {
			pword = hash;
			console.log(pword);
		});
		msg = await new usersModel({
			username: uname,
			password: pword
		});
		await msg
			.save()
			.then(doc => {
				//console.log(doc);
				status = doc;
			})
			.catch(err => {
				console.error(err);
				if (err.code === 11000) {
					status = {
						status: 400,
						error: "Duplicate Username"
					};
				} else {
					status = {
						status: 400,
						error: err.message
					};
				}
			});
		next().then(() => {
            status["status"] = 200;
            console.log(status);
			ctx.body = status;
		});
	});
};
