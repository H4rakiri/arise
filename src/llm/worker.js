// Web Worker для инференса WebLLM — UI не подвисает (§9).
// Библиотека подтягивается динамически только когда нейронка включена.

let handler = null;

self.onmessage = async (msg) => {
  if (!handler) {
    const { WebWorkerMLCEngineHandler } = await import('@mlc-ai/web-llm');
    handler = new WebWorkerMLCEngineHandler();
  }
  handler.onmessage(msg);
};
