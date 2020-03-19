module.exports = ({ router }) => {
    const usersModel = require('../models/users');
	router.post("/api/register", async (ctx, next) => {
        let uname = ctx.request.body.username;
        let pword = ctx.request.body.password;
        let msg = new usersModel({
            username: uname,
            password: pword
        });
        await msg.save()
        .then((doc) => {
            console.log(doc);
            status = doc;
        })
        .catch((err) => {
            console.error(err);
            if(err.code === 11000){
                status = { error : "Duplicate Username"};
            }
            else{
                status = { error : err.message};
            } 
        });
        next().then(() =>{
            ctx.body = status;
        });
        
        
	});
};
