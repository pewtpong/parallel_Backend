const mongoose = require('mongoose');
const validator = require('validator');

const Schema = mongoose.Schema;
const chatRoomsSchema = new Schema({
    chatName: String,
    lastestUpdate: Date,
    member:Array,
    message: Array,
    chatType: String
});

module.exports = mongoose.model('ChatRooms',chatRoomsSchema);
