module.exports = ({ router }) => {
    const jwt = require('jsonwebtoken');
    const usersModel = require('../models/users');
	router.post("/api/auth", async (ctx, next) => {
        console.log(ctx.request.body);
        const token = jwt.sign(ctx.request.body,'ww');
        ctx.body= token;
	});
};
