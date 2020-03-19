const mongoose = require('mongoose');
const validator = require('validator');

const Schema = mongoose.Schema;
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        validate: (value) =>{
            return validator.isAlphanumeric(value);
        }
    },
    password: String,
});

module.exports = mongoose.model('Users',userSchema);
