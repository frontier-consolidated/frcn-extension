import browser from "webextension-polyfill";

import { Extension } from "./extension";
import { request } from "./request";

browser.action.onClicked.addListener(() => {
    browser.tabs.create({
        url: import.meta.env.VITE_ORIGIN
    })
})

const extension = new Extension()
const tavernId = (Math.random() + 1).toString(36).substring(2)

extension.handle<{ method: string, path: string, data?: any }>("spectrumRequest", async (req) => {
    const response = await request(req.message.method, "/api/spectrum" + req.message.path, {
        headers: {
            "Content-Type": "application/json",
            "X-Tavern-Id": tavernId
        },
        responseType: "json",
        data: req.message.data
    })
    
    req.send(response)
})