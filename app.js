const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const {ObjectId} = require("mongodb");

const cors = require('cors');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const servicesRouter = require('./routes/services');
const appointmentsRouter = require('./routes/appointments');
const payementsRouter = require('./routes/payements');
const offersRouter = require('./routes/offers');
const statsRouter = require('./routes/stats');

var mongoose = require('mongoose');
// const { connectToDb, getDb } = require('./db');

const app = express();



app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({origin:"*"}));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/services', servicesRouter);
app.use('/appointments', appointmentsRouter);
app.use('/payements', payementsRouter);
app.use('/offers', offersRouter);
app.use('/stats', statsRouter);


//--------------------------------------------------------------------
  mongoose.connect("mongodb+srv://m1p11api:PdGFmN2el5hmOPlO@m1p11api.gxfuco9.mongodb.net/m1p11api?retryWrites=true&w=majority&appName=m1p11api")
  .then(()=>{
    app.listen(3000, ()=>{
      console.log('app listening on port 3000');
    })
  })
  .catch(err=>{
    console.log("Cannot failed: ",err)
  })


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next();
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
  next();
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;


