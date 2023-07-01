const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fname:{
        type:String,
    },
    lname:{
        type:String,
    },
    email: {
         type: String,
    },
    password:{
        type:String,
    },
    isAdmin :{
        type:Boolean,
        default:false
    },
    profilePic:{
        type: String,
        default: ""
    },
});

module.exports = mongoose.model("User",userSchema);