const axios = require('axios');
const ping = require('ping');
const Worker = require('./worker');
const config = require('../config/config');

//TODO: move to config
const pingHost = 'host-176-38-7-39.b026.la.net.ua';

class HealthWorker extends Worker {
  constructor() {
    const errorHandler = (err) => {
      this.errors.push(err);
      if (this.errors.length < 3) {
        return;
      }
      if (this.errors.length === 3) {
        const telegramClient = axios.create({
          baseURL: config.telegramBotUrl,
          headers: {
            'Content-Type': 'application/json',
            'Charset': 'utf-8',
          }
        });

        telegramClient.post('/sendMessage', {
          chat_id: config.telegramChatId,
          text: '📵 There is no power supply!',
        }).catch(error => console.log(error));
      }
    }

    const createWorker = () => setInterval(() => {
      console.log(`http://${pingHost}:8080`)
      axios.get(`http://${pingHost}:8080`).then((res) => {
        if (!res.status > 400) {
          return errorHandler(res);
        }
        // clear errors on success
        if (this.errors.length > 0) {
          this.errors = [];
        }
      }).catch((err) => {
        errorHandler(err);
      })
    }, 5000);

    super(createWorker);
  }

  getStatus() {
    return !this.errors;
  }
}

module.exports = HealthWorker;