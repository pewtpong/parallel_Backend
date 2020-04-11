const usersModel = require("../models/users");
const bcrypt = require("../utils/bcrypt");
const multer = require("koa-multer");
const fs = require("fs");
const upload = multer({ dest: __dirname + "/uploads/images" });

module.exports = ({ router }) => {
	router.patch("/api/profile", upload.single("avatar"), async (ctx, next) => {
		console.log(ctx.req.file);
		var tmp_path = ctx.req.file.path;
		var target_path = "uploads/images/" + ctx.req.file.originalname;
		var src = fs.createReadStream(tmp_path);
		var dest = fs.createWriteStream(target_path);
		src.pipe(dest);
		src.on("end", function () {
			ctx.body = "done";
		});
		src.on("error", function (err) {
			ctx.body = "error";
        });
	});
};
