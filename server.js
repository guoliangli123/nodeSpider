var http = require("http"),
    url = require("url"),
    superagent = require("superagent"), //处理用户请求
    cheerio = require("cheerio"), //处理数据模块
    async = require("async"),
    eventproxy = require("eventproxy"), //解决callback嵌套问题
    models = require('./models');
var ep = eventproxy();
var Person = models.Person,
    Article = models.Article;
var catchFirstUrl = "http://www.cnblogs.com/",
    deleteRepeat = {}, //去重
    urlsArray = [],
    catchData = [], //爬去的数据
    pageUrls = [], //存放文章页面网址
    pageNum = 1,
    startDate = new Date(),
    endDate = false,
    articleData = []; //存放爬取的文章
// Person.find({}, function(err, docs) {
//     console.log(docs);
// });
console.log(Person);
for (var i = 0; i <= pageNum; i++) {
    pageUrls.push('http://www.cnblogs.com/?CategoryId=808&CategoryType=%22SiteHome%22&ItemListActionName=%22PostList%22&PageIndex=' + i + '&ParentCategoryId=0');
}

//分析用户信息
function personInfo(url) {
    var infoArray = {};
    superagent.get(url).end(function(err, ares) {
        if (err) {
            console.log(err);
            return;
        }
        var $ = cheerio.load(ares.text),
            info = $('#profile_block a'),
            len = info.length,
            age = "",
            flag = false,
            curDate = new Date();
        // 小概率异常抛错	
        try {
            age = "20" + (info.eq(1).attr('title').split('20')[1]);
        } catch (err) {
            console.log(err);
            age = "2016-12-06";
        }

        infoArray.name = info.eq(0).text();
        infoArray.age = parseInt(new Date() - new Date(age)) / 1000 / 60 / 60 / 24;

        if (len == 4) {
            infoArray.fans = info.eq(2).text();
            infoArray.focus = info.eq(3).text();
        } else if (len == 5) {
            infoArray.fans = info.eq(3).text();
            infoArray.focus = info.eq(4).text();
        }
        catchData.push(infoArray);
    })
}

//判断作者重复
function isRepeat(name) {
    if (deleteRepeat[name] == undefined) {
        deleteRepeat[name] = 1;
        return 0;
    } else if (deleteRepeat[name] == 1) {
        return 1;
    }
}

//主程序

function start() {

    function onRequest(req, res) {
        // 设置字符编码(去掉中文会乱码)
        res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
        ep.after("BlogArticleHtml", pageUrls.length * 20, function(articleUrls) {
            for (var i = 0; i < articleUrls.length; i++) {
                res.write(articleUrls[i] + '<br/>');
            }
            console.log('lenth is' + articleUrls.length + 'content is' + articleUrls)

            //控制并发数
            var curCount = 0;

            var reptileMove = function(url, cb) {
                var delay = parseInt((Math.random() * 30000000) % 1000, 10);
                curCount++;
                console.log('现在并发数是', curCount, '正在抓取的是', url, '耗时' + delay + '毫秒');
                superagent.get(url).end(function(err, sres) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    var $ = cheerio.load(sres.text);
                    //收集用户信息
                    var currentBlogApp = url.split('/p/')[0].split('/')[3],
                        requestId = url.split('/p/')[1].split('.')[0];

                    //收集文章信息
                    var article = {};
                    article.title = $('title');
                    article.content = $('#cnblogs_post_body').html();
                    articleData.push(article);
                    res.write('currentBlogApp is ' + currentBlogApp + ',requestId is ' + requestId);
                    res.write('the article title is ' + $('title').text() + '<br/>');
                    var flag = isRepeat(currentBlogApp);
                    if (!flag) {
                        var appUrl = "http://www.cnblogs.com/mvc/blog/news.aspx?blogApp=" + currentBlogApp
                        personInfo(appUrl);
                    }
                })
                setTimeout(function() {
                    curCount--;
                    cb(null, url + 'Call back content');
                }, delay);
            };

            //使用async控制异步抓取
            async.mapLimit(articleUrls, 5, function(url, cb) {
                reptileMove(url, cb);
            }, function(err, result) {
                endDate = new Date();
                var len = catchData.length,
                    aveAge = 0,
                    aveFans = 0,
                    aveFocus = 0;
                for (var i = 0; i < len; i++) {
                    var data = JSON.stringify(catchData[i]),
                        dataJson = catchData[i];

                    dataJsonFans = dataJson.fans || 10;
                    dataJsonFocus = dataJson.focus || 11;
                    aveAge += parseInt(dataJson.age);
                    aveFans += parseInt(dataJsonFans)
                    aveFocus += parseInt(dataJsonFocus);
                    res.write(data + '<br/>');

                    //console.log(dataJson);
                    //用户信息存入数据库

                    var node = new Person();
                    node.name = dataJson.name;
                    node.age = dataJson.age;
                    node.fans = dataJsonFans;
                    node.focus = dataJsonFocus;
                    //console.log(node);
                    node.save(function(err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('The new node is saved');
                        }
                    });
                }

                //文章信息存入数据库
                for (var i = 0, len = articleData.length; i < len; i++) {
                    var articlenode = new Article();
                    articlenode.title = articleData[i].title;
                    articlenode.content = articleData[i].content;
                    articlenode.save(function(err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('The new article is saved')
                        }
                    })
                }
                //统计结果
                res.write('<br/>');
                res.write('<br/>');
                res.write('/**<br/>');
                res.write(' * 爬虫统计结果<br/>');
                res.write('**/<br/>');
                res.write('1、爬虫开始时间：' + startDate + '<br/>');
                res.write('2、爬虫结束时间：' + endDate + '<br/>');
                res.write('3、耗时：' + (endDate - startDate) + 'ms' + ' --> ' + (Math.round((endDate - startDate) / 1000 / 60 * 100) / 100) + 'min <br/>');
                res.write('4、爬虫遍历的文章数目：' + pageNum * 20 + '<br/>');
                res.write('5、作者人数：' + len + '<br/>');
                res.write('6、作者入园平均天数：' + Math.round(aveAge / len * 100) / 100 + '<br/>');
                res.write('7、作者人均粉丝数：' + Math.round(aveFans / len * 100) / 100 + '<br/>');
                res.write('8、作者人均关注数：' + Math.round(aveFocus / len * 100) / 100 + '<br/>');

            })
        });
        pageUrls.forEach(function(pageUrl) {
            superagent.get(pageUrl).end(function(err, pres) {
                console.log('fetch' + pageUrl + 'successful');
                if (err) {
                    console.log(err)
                }
                //处理获取的内容
                var $ = cheerio.load(pres.text);
                var curPageUrls = $('.titlelnk');
                console.log(curPageUrls.length);
                for (var i = 0; i < curPageUrls.length; i++) {
                    var articleUrl = curPageUrls.eq(i).attr('href');
                    console.log(articleUrl);
                    urlsArray.push(articleUrl);
                    ep.emit('BlogArticleHtml', articleUrl);
                }
            })
        })
    }
    http.createServer(onRequest).listen(3000)
}

exports.start = start;