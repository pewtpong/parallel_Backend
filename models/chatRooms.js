const mongoose = require('mongoose');
const validator = require('validator');

const Schema = mongoose.Schema;
const chatRoomsSchema = new Schema({
    chatName: String,
    lastestUpdate: Date,
    members:[{
        lastestUpdate: Date,
        uid: String,
        username: String,
        profilePic: String
    }],
    messages: Array,
    chatType: String,
    owner: String
});

module.exports = mongoose.model('ChatRooms',chatRoomsSchema);
