const passport = require("koa-passport");

const fetchUser = (() => {
    const user = { id: 1, user: "test", password: "test" };
    return async () =>{
        return user;
    }
});
