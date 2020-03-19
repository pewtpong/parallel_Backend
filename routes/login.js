module.exports = ({ router }) => {
    const usersModel = require('../models/users');
	router.post("/api/login", async (ctx, next) => {
        let status;
        let uname = ctx.request.body.username;
        let pword = ctx.request.body.password;
        await usersModel.find({
            username : uname
        })
        .then((doc) => {
            if(doc.length == 0){
                throw status = { status : 404,msg:"No user"};
            }
            else if(pword != doc[0].password){
                throw status = { status : 404,msg:"Wrong password"};
            }
            else{
                status ={
                    status : 200,
                    msg : "Success"
                };
            }
        })
        .catch((err) => {
            console.error(err);
        });
        next().then(() =>{
            ctx.body = status;
        });
        
        
	});
};
