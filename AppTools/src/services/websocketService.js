// src/services/websocketService.js

class WebSocketService {
  socket = null;
  isConnected = false;
  isReconnecting = false;
  eventHandlers = {};
  reconnectAttempts = 0;
  maxReconnectAttempts = 5;
  reconnectDelay = 2000;
  subscriptions = new Set();

  init(baseUrl) {
    this.disconnect();
    this.isReconnecting = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = baseUrl
      ? baseUrl.replace(/^http(s)?:/, protocol)
      : `${protocol}//${window.location.host}`;
    this.socket = new WebSocket(`${url}/ws`);
    this._setupListeners();
  }

  _setupListeners() {
    ['open', 'message', 'close', 'error'].forEach((evt) =>
      this.socket.addEventListener(
        evt,
        this[`_on${evt.charAt(0).toUpperCase() + evt.slice(1)}`].bind(this)
      )
    );
  }

  _onOpen() {
    this.isConnected = true;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.subscriptions.forEach((type) => this._subscribe(type));
    this._trigger('connect');
  }

  _onMessage({ data }) {
    try {
      const { type, payload } = JSON.parse(data);
      this._trigger(type, payload);
    } catch (err) {
      console.error('[WS] Message parse error:', err);
    }
  }

  _onClose() {
    this.isConnected = false;
    this._trigger('disconnect');
    this._reconnect();
  }

  _onError(err) {
    console.error('[WS] Error:', err);
    this._trigger('error', err);
  }

  _reconnect() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return console.error('[WS] Reconnect aborted');
    }
    this.isReconnecting = true;
    this.reconnectAttempts++;
    setTimeout(() => !this.isConnected && this.init(), this.reconnectDelay);
  }

  send(type, payload) {
    if (!this.isConnected) {
      console.warn('[WS] Cannot send, not connected');
      return false;
    }
    this.socket.send(JSON.stringify({ type, payload }));
    return true;
  }

  subscribe(entity) {
    const type = this._normalize(entity);
    if (!this.subscriptions.has(type)) {
      this.subscriptions.add(type);
      this._subscribe(type);
    }
  }

  _normalize(type) {
    return type.endsWith('s') ? type : `${type}s`;
  }

  _subscribe(type) {
    this.send('subscribe', { entityType: type });
  }

  on(event, callback) {
    const handlers = (this.eventHandlers[event] ??= []);
    if (!handlers.includes(callback)) handlers.push(callback);
  }

  off(event, callback) {
    if (!this.eventHandlers[event]) return;
    if (callback) {
      this.eventHandlers[event] = this.eventHandlers[event].filter((fn) => fn !== callback);
    } else {
      delete this.eventHandlers[event];
    }
  }

  _trigger(event, data) {
    this.eventHandlers[event]?.forEach((fn, i) => {
      try {
        fn(data);
      } catch (err) {
        console.error(`[WS] Handler ${i + 1} error on '${event}':`, err);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.isReconnecting = false;
    }
  }

  listAllListeners() {
    console.log(
      '[WS] Listeners:',
      Object.entries(this.eventHandlers)
        .map(([e, fns]) => `${e}(${fns.length})`)
        .join(', ')
    );
    console.log('[WS] Subscriptions:', [...this.subscriptions].join(', '));
  }
}

const websocketService = new WebSocketService();
export default websocketService;
