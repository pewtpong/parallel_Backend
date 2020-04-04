const usersModel = require('../models/users');
const authenticated = require('../middleware/authenticated');
module.exports = ({ router }) => {
	router.post("/api/home", authenticated ,async (ctx, next) => {
        const uname = ctx.request.jwtPayload.username;
        console.log(uname);
        await usersModel.find({
            username : uname
        }).then((doc) =>{
            console.log(doc);
            ctx.body = doc;
        })
	});
};
