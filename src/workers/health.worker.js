const axios = require('axios');
const config = require('../config/config');

// TODO: move to config
const pingHost = 'host-176-38-7-39.b026.la.net.ua';
const maxRetries = 3;

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
      if (this.errors.length === maxRetries) {
        telegramClient.post('/sendMessage', {
          chat_id: config.telegramChatId,
          text: '📵 There is no power supply!',
        }).catch(err => console.error(err));
      }
    }

    const reconnectHandler = async () => {
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
      axios.get(`http://${pingHost}:8080`).then((res) => {
        console.log(res);
        if (res.status && this.error()) {
          return reconnectHandler();
        }
      }).catch((err) => {
        console.error(err);
        errorHandler(err);
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