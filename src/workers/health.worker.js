const axios = require('axios');
const ping = require('ping');
const Worker = require('./worker');
const config = require('../config/config');

//TODO: move to config
const pingHost = 'host-176-38-7-39.b026.la.net.ua';

class HealthWorker extends Worker {
    #errors = [];

    #errorHandler = (err) => {
        this.#errors.push(err);
        if (this.#errors.length < 3) {
            return;
        }
        if (this.#errors.length === 3) {
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

    constructor() {
        const createWorker = () => setInterval(() => {
            ping.promise.probe(pingHost, {
                timeout: 2, 
                min_reply: 4,
            }).then((res) => {
                const alive = res.alive && res.times.length === 4;
                console.log(res, `${res.host} is ${alive ? 'alive' : 'dead'}`);
                if (!alive) {
                    return this.#errorHandler(res);
                }
                // clear errors on success
                if (this.#errors.length > 0) {
                    this.#errors = [];
                }
            }).catch((err) => {
                console.error(err);
            })
        }, 5000);
        super(createWorker);
    }

    getStatus() {
        return !this.#errors;
    }
}

module.exports = HealthWorker;