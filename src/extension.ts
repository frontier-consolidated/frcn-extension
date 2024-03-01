import browser from "webextension-polyfill";
import { RequestPayload } from "./types";
import logger from "./logger";

type Request<T> = {
    message: T;
    send(value: any): void;
    err(msg: string): void;
}

type RequestHandler<T = any> = (request: Request<T>) => void | Promise<void>

export class Extension {
    private connection?: browser.Runtime.Port;
    private handlers: Record<string, RequestHandler> = {}

    constructor() {
        browser.runtime.onConnect.addListener((connection) => {
            logger.info("Extension connected")
            this.connection = connection;

            connection.onMessage.addListener(async (msg) => {
                await this.handleRequest(msg)
            })

            connection.onDisconnect.addListener(() => {
                logger.info("Extension disconnected")
            })
        })
    }

    handle<T>(type: string, handler: RequestHandler<T>) {
        this.handlers[type] = handler;
    }
    
    private send(requestId: string, value: any) {
        this.connection?.postMessage({
            requestId,
            value: JSON.stringify(value)
        })
    }

    private error(requestId: string, message: string) {
        this.connection?.postMessage({
            requestId,
            error: { message }
        })
    }

    private async handleRequest(msg: RequestPayload) {
        const handler = this.handlers[msg.type] as RequestHandler | undefined
        if (handler) {
            const extension = this;
            try {
                await handler({
                    message: msg.message,
                    send(value) {
                        extension.send(msg.id, value)
                    },
                    err(err) {
                        extension.error(msg.id, err)
                    },
                })
            } catch (err) {
                logger.error(err as Error)
                this.error(msg.id, (err as Error).message)
            }
        } else {
            this.error(msg.id, "Unknown request type")
        }

    }
}
