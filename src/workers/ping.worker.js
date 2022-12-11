const ping = require('ping');
const axios = require('axios');
const config = require('../config/config');

// TODO: move to config
const pingHost = 'host-176-38-7-39.b026.la.net.ua';
const maxRetries = 4;

// TODO:  add options
const healthWorker = (options) => ({
  errors: [],
  interval: null,
  start() {
    const telegramClient = axios.create({
      baseURL: config.telegramBotUrl,
      headers: {
        'Content-Type': 'application/json',
        'Charset': 'utf-8',
      }
    });

    const errorHandler = (err) => {
      this.errors.push(err);
      if (this.errors.length > 5) {
        this.errors = this.errors.slice(-5);
      }
      console.error(`errors count: ${this.errors.length}`, err);
      if (this.errors.length === maxRetries) {
        telegramClient.post('/sendMessage', {
          chat_id: config.telegramChatId,
          text: '📵 There is no power supply!',
        }).catch(err => console.error(err));
      }
    }

    const reconnectHandler = async () => {
      console.log('reconnected, clearing errors');
      this.errors = [];
      try {
        return await telegramClient.post('/sendMessage', {
          chat_id: config.telegramChatId,
          text: '⚡️ Home is back online!',
        });
      } catch (err) {
        console.error(err)
      }
    }

    this.interval = setInterval(() => {
      ping.promise.probe(pingHost, {
        timeout: 2,
        min_reply: 4,
      }).then((res) => {
        const alive = res.alive && res.times.length === maxRetries;
        console.log(res, `${res.host} is ${alive ? 'alive' : 'dead'}`);
        if (!alive) {
          return errorHandler(res);
        }
        if (alive && this.error()) {
          return reconnectHandler();
        }
        this.errors = []
      }).catch((err) => {
        console.error(err);
      })
    }, 5000);
  },
  stop() {
    clearInterval(this.interval);
  },
  error() {
    return this.errors.length >= maxRetries;
  }
});

module.exports = healthWorker;