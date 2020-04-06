const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const currentClientsSchema = new Schema({
    uid: String,
    sid: String,
    lastestUpdate: Date,
});

module.exports = mongoose.model('CurrentClients',currentClientsSchema);