const axios = require('axios');
const Worker = require('./worker');
const config = require('../config/config');

class HealthWorker extends Worker {
    #errors = 0;

    #errorHandler = () => {
        this.#errors += 1;
        if (this.#errors < 3) {
            return;
        }
        if (this.#errors === 3) {
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

    #createWorker = () => setInterval(() => {
        axios.get('http://host-176-38-7-39.b026.la.net.ua:8080')
            .then((res) => {
                if (res.status > 400) {
                    this.#errorHandler();
                    return;
                }
                this.#errors = 0;
            })
            .catch((error) => {
                console.error(error);
                this.#errorHandler();
            });
    }, 5000)


    constructor() {
        super(this.#createWorker);
    }
}

module.exports = HealthWorker;