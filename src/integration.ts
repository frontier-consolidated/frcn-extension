import browser from "webextension-polyfill";
import logger from "./logger";
import { IntegrationPayload } from "./types";

const extension: {
    connection?: browser.Runtime.Port;
    pendingRequest?: unknown;
} = {}

function connect() {
    const connection = browser.runtime.connect()
    extension.connection = connection;
    logger.info("Extension connected")

    connection.onDisconnect.addListener(() => {
        logger.info("Extension disconnected, reconnecting...")
        connect()
    })

    connection.onMessage.addListener((msg) => {
        delete extension.pendingRequest;

        window.postMessage({
            type: "frcnIntegrationResponse",
            message: msg
        }, import.meta.env.VITE_ORIGIN)
    })

    if (extension.pendingRequest) {
        connection.postMessage(extension.pendingRequest)
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    connect()
    
    window.addEventListener("message", function (event: MessageEvent<IntegrationPayload>) {
        if (event.source !== window) return;
        if (!event.data || event.data.type !== "frcnIntegrationRequest") return;
        if (!extension.connection) return;

        logger.info("Received request", event.data.message as object)

        extension.pendingRequest = event.data.message;
        extension.connection.postMessage(event.data.message);
    })

    const meta = document.createElement("meta")
    meta.setAttribute("name", "frcn-integration-version")
    meta.setAttribute("content", APP_VERSION)
    
    const root = document.head || document.documentElement
    root.appendChild(meta)

    logger.info("Extension loaded")

})