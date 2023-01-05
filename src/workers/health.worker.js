const axios = require('axios');
const config = require('../config/config');
const http = require('http');

// TODO: move to config
const maxRetries = 4;
const chatIds = [config.telegramChatId].concat(config.additionalChatIds);

// TODO:  add options
const healthWorker = ({ host }) => ({
  errors: [],
  aliveFrom: null,
  deadFrom: null,
  interval: null,
  start() {
    const telegramClient = axios.create({
      baseURL: config.telegramBotUrl,
      headers: {
        'Content-Type': 'application/json',
        'Charset': 'utf-8',
      },
      httpAgent: new http.Agent({ keepAlive: false }),
    });

    const errorHandler = (err) => {
      if (this.errors.length <= maxRetries) {
        this.errors.push(err);
      }
      if (this.errors.length === maxRetries) {
        this.deadFrom = new Date().toLocaleString('uk-UK', {timezone: 'Europe/Kyiv'});
        chatIds.forEach((chatId) => {
          telegramClient.post('/sendMessage', {
            chat_id: chatId,
            text: '📵 There is no power supply!',
          }).catch(err => console.error(err));
        });
      }
    }

    const reconnectHandler = async () => {
      this.errors = [];
      this.aliveFrom = new Date().toLocaleString('uk-UK', {timezone: 'Europe/Kyiv'});
      chatIds.forEach((chatId) => {
        telegramClient.post('/sendMessage', {
          chat_id: chatId,
          text: '⚡️ Home is back online!',
        }).catch(err => console.error(err));
      });
    }

    this.interval = setInterval(() => {
      axios.get(host, {
        params: {
          t: Date.now()
        },
        timeout: 4000,
        httpAgent: new http.Agent({ keepAlive: false }),
      }).then((res) => {
        if (this.error()) {
          reconnectHandler();
        }
        this.errors = [];
      }).catch((err) => {
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