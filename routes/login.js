const usersModel = require('../models/users');
const bcrypt = require('../utils/bcrypt');
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'secret';

module.exports = ({ router }) => {
	router.post("/api/login", async (ctx, next) => {
        //console.log("login");
        let status;
        let uname = ctx.request.body.username;
        let pword = ctx.request.body.password;
        await usersModel.find({
            username : uname
        })
        .then(async (doc) => {
            if(doc.length == 0){
                throw status = { status : 404,msg:"No user"};
            }
            else if(! await bcrypt.compare(pword,doc[0].password)){
                throw status = { status : 404,msg:"Wrong password"};
            }
            else{
                const token = jwt.sign(uname,secret);
                status ={
                    token : token,
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
