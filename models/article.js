const mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ArticleSchema = new Schema({
    title: String,
    content: String
})

exports.ArticleSchema = ArticleSchema;
//mongoose.model('Article', ArticleSchema);