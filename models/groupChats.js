const mongoose = require('mongoose');
const validator = require('validator');

const Schema = mongoose.Schema;
const groupChatSchema = new Schema({
    groupname: String,
    lastestUpdate: Date,
    member:Array,
    message: Array
});

module.exports = mongoose.model('groupChat',groupChatSchema);
