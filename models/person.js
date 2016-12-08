const mongoose = require("mongoose");
var Schema = mongoose.Schema;

var PersonSchema = new Schema({
    name: String,
    age: Number,
    fans: Number,
    focus: Number
})

exports.PersonSchema = PersonSchema;