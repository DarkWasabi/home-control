const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');
const healthWorker = require('./workers/health.worker');

const app = express();

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

console.debug('set security HTTP headers');
// set security HTTP headers
app.use(helmet());

console.debug('parse json request body');
// parse json request body
app.use(express.json());

console.debug('parse urlencoded request body');
// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

console.debug('sanitize request data');
// sanitize request data
app.use(xss());
app.use(mongoSanitize());

console.debug('gzip compression');
// gzip compression
app.use(compression());

console.debug('enable cors');
// enable cors
app.use(cors());
app.options('*', cors());

console.debug('jwt authentication');
// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

console.debug('limit repeated failed requests to auth endpoints');
// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

console.debug('v1 api routes');
// v1 api routes
app.use('/v1', routes);

const healthWorkerInstance = healthWorker();
const workers = [
  healthWorkerInstance,
];
workers.forEach((worker) => {
  console.debug('starting worker', worker);
  worker.start();
});
const router = express.Router();
router.use('/', (req, res) => {
  console.log(healthWorkerInstance);
  const status = healthWorkerInstance.error() ? httpStatus.BAD_GATEWAY : httpStatus.OK;
  res.status(status).send({
    status: !healthWorkerInstance.error(),
    errors: healthWorkerInstance.errors,
  });
});
app.use(router);

console.debug('send back a 404 error for any unknown api request');
// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

console.debug('convert error to ApiError, if needed');
// convert error to ApiError, if needed
app.use(errorConverter);

console.debug('handle error');
// handle error
app.use(errorHandler);

module.exports = app;
