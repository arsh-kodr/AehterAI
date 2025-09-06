const mongoose = require("mongoose");

function connectToDB() {
   return mongoose.connect(process.env.MONGO_URL).then(() => console.log("Connected to MongoDB")
    ).catch(err => console.log("Error in connecting to DB" , err)
    )
}

module.exports = connectToDB;