module.exports = ({router}) =>{
    router.get('/',(ctx,next) => {
        console.log(ctx.header);
        if(ctx.header.authorization === "Pewt"){
            ctx.body = { msg: "test1"}
        }
        else{
            ctx.body = { err: "Not auth"}
        }
    });
};