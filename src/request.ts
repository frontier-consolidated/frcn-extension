import axios, { AxiosAdapter, AxiosHeaders, AxiosRequestConfig } from "axios"
import browser from "webextension-polyfill"
import logger from "./logger"
import fetchAdapter from "./fetchAdapter"

const instance = axios.create({
    baseURL: "https://robertsspaceindustries.com",
    withCredentials: true,
    xsrfCookieName: "Rsi-XSRF",
    adapter: fetchAdapter as AxiosAdapter
})

async function getRsiTokens() {
    const cookie = await browser.cookies.get({
        url: "https://robertsspaceindustries.com/",
        name: "Rsi-Token"
    })

    if (!cookie) {
        throw new Error("Not logged in to robertsspaceindustries.com")
    }

    const device = await browser.cookies.get({
        url: "https://robertsspaceindustries.com/",
        name: "_rsi_device"
    })

    const stored = await browser.storage.local.get(["frcn_rsiToken", "frcn_rsiCsrf", "frcn_rsiDeviceId"])

    let tokenRefreshed = cookie.value !== stored.frcn_rsiToken;
    if (tokenRefreshed) await browser.storage.local.set({ frcn_rsiToken: cookie.value });

    const deviceId = device ? device.value : stored.frcn_rsiDeviceId
    if (device && device.value != stored.frcn_rsiDeviceId) await browser.storage.local.set({ frcn_rsiDeviceId: stored.value });

    let csrf: string | undefined = stored.frcn_rsiCsrf;
    if (tokenRefreshed || !stored.frcn_rsiCsrf) {
        try {
            const response = await instance.get<string>("/store/pledge/browse/extras", {
                responseType: "text"
            })

            const match = response.data.match(/meta\s+name="csrf-token"\s+content="(.+?)"/)
            if (!match) {
                logger.error("Could not find csrf token in response")
            } else {
                csrf = match[1];
                await browser.storage.local.set({ frcn_rsiCsrf: csrf })
            }
        } catch (err) {
            logger.error("Could not fetch csrf token", err as Error)
        }
    }

    return {
        token: cookie.value,
        csrf,
        deviceId
    }
}

export async function request<T>(method: string, path: string, config?: AxiosRequestConfig) {
    const { token, csrf } = await getRsiTokens()

    const headers = new AxiosHeaders(config?.headers as AxiosHeaders | undefined)
    headers.set("X-Rsi-Token", token)
    headers.set("x-csrf-token", csrf)

    const request = {
        ...config,
        method,
        url: path,
        headers,
    }
    
    logger.info("Request:", request)
    const response = await instance.request<T>(request)
    logger.info("Response:", response)
    return response;
}
