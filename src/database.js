let mongoose = require('mongoose');

const server = 'mongodb+srv://test:paralleldb@test0-h5zvu.mongodb.net'; // REPLACE WITH YOUR DB SERVER
const database = 'parallelDB';      // REPLACE WITH YOUR DB NAME

class Database {
  constructor() {
    this._connect()
  }
  
_connect() {
     mongoose.connect(`${server}/${database}`)
       .then(() => {
         console.log('Database connection successful')
       })
       .catch(err => {
         console.error('Database connection error');
         
       })
  }
}

module.exports = new Database()