class Worker  {
    #intervalCreator = null;
    #interval = null;

    constructor(intervalCreator) {
        this.#intervalCreator = intervalCreator;
    }

    start() {
        if (!typeof this.interval === 'function') {
            throw new Error('Callback is not set');
        }
        this.#interval = this.#intervalCreator();
    }
    
    stop() {
        clearInterval(this.#interval);
    }
}

module.exports = Worker;