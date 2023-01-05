const axios = require('axios');
const config = require('../config/config');
const http = require('http');

// TODO: move to config
const maxRetries = 4;

// TODO:  add options
const healthWorker = ({ host }) => ({
  errors: [],
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
      this.errors.push(err);
      if (this.errors.length > 5) {
        this.errors = this.errors.slice(-5);
      }
      console.error(`errors count: ${this.errors.length}`, err);
      if (this.errors.length === maxRetries) {
        const chatIds = [config.telegramChatId].concat(config.additionalChatIds);
    
        chatIds.forEach((chatId) => {
          telegramClient.post('/sendMessage', {
            chat_id: chatId,
            text: '📵 There is no power supply!',
          }).catch(err => console.error(err));
        })
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
      axios.get(host, {
        params: {
          t: Date.now()
        },
        timeout: 1000,
        httpAgent: new http.Agent({ keepAlive: false }),
      }).then((res) => {
        console.log(`response status: ${res.status}`);
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