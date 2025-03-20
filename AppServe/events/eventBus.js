// events/eventBus.js
const EventEmitter = require('events');

class EventBus extends EventEmitter {
  emit(event, payload) {
    console.log(`[EVENT] ${event}`, payload);
    return super.emit(event, payload);
  }
}

module.exports = new EventBus();
