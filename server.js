var session = require('express-session');
var express = require('express');
var logger = require('morgan');
var pgp = ('pg')

const db = pgp(process.env.DATABASE_URL || "postgres://localhost:5432/yourproject");

app.use(session({
    store: new pgSession({
      conString: process.env.DATABASE_URL || "postgres://localhost:5432/yourproject",
    }),
    key: 'user_sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 10 * 10 * 6000000 },
  }));