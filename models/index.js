const mongoose = require('mongoose');
const dbConfig = require('../db/config');

mongoose.connect(dbConfig.dbLogin);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error'));

db.once('open', function() {
    console.log('mongodb server start');
})

//加载模型
var PersonSchema = require('./person');
var ArticleSchema = require('./article');
console.log(PersonSchema.PersonSchema);
// console.log(mongoose.model('Article'))
var Person = mongoose.model('Person', PersonSchema.PersonSchema);
var Article = mongoose.model('Article', ArticleSchema.ArticleSchema);

exports.Person = Person;
exports.Article = Article;