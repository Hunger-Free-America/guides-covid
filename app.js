var session = require('express-session');
var express = require('express');
var hbs = require('hbs');
var logger = require('morgan');
var path = require('path');
var bodyParser = require('body-parser');

const db = require('./database');

var pgSession = require('connect-pg-simple')(session);

var app = express();
var index = require('./routes/index');


app.use(session({
    store: new pgSession({
        conString: db.$cn,
    }),
    key: 'user_sid',
    secret: (process.env.SESSION_SECRET || 'ILoveNana1213'),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 10 * 10 * 6000000 },
}));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(__dirname + '/views/partials');
app.set('view engine', 'hbs');

app.use(express.static(path.join(__dirname, 'public')));

// res.locals is an object passed to hbs engine
app.use(function (req, res, next) {
    res.locals.session = req.session;
    next();
});

app.use('/', index);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;