const usersModel = require("../models/users");
const bcrypt = require("../utils/bcrypt");
const multer = require("koa-multer");
const fs = require("fs");
const upload = multer({ dest: __dirname + "/uploads/images" });

module.exports = ({ router }) => {
	router.post("/api/profile", upload.single("avatar"), async (ctx, next) => {

		console.log(ctx.req.file);
		let tmp_path = ctx.req.file.path;
        let target_path = "uploads/images/" + '_' + Math.random().toString(36).substr(2, 9) + ".png";
		let src = fs.createReadStream(tmp_path);
		let dest = fs.createWriteStream(target_path);
        src.pipe(dest);
        await usersModel.findOneAndUpdate()
		/*src.on("end", function () {
			ctx.body = "done";
		});
		src.on("error", function (err) {
			ctx.body = "error";
        });*/

	});
};
