import axios, { AxiosError, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from "axios";
// @ts-ignore
import settle from "axios/unsafe/core/settle.js";
// @ts-ignore
import buildURL from "axios/unsafe/helpers/buildURL.js";
// @ts-ignore
import buildFullPath from "axios/unsafe/core/buildFullPath.js";
// @ts-ignore
import * as utils from "axios/unsafe/utils.js";
const { isUndefined, isStandardBrowserEnv, isFormData } = utils.default

type AdapterConfig = InternalAxiosRequestConfig & RequestInit & { settle?: (resolve: (value: unknown) => void, reject: (reason?: any) => void, data: any) => void }

export default async function fetchAdapter(config: AdapterConfig) {
    const request = createRequest(config);
	const promiseChain = [getResponse(request, config)];

	if (config.timeout && config.timeout > 0) {
		promiseChain.push(
			new Promise((res) => {
				setTimeout(() => {
					const message = config.timeoutErrorMessage
						? config.timeoutErrorMessage
						: "timeout of " + config.timeout + "ms exceeded";
					res(createError(message, config, "ECONNABORTED", request));
				}, config.timeout);
			})
		);
	}

	const data = await Promise.race(promiseChain);
	return new Promise((resolve, reject) => {
		if (data instanceof Error) {
			reject(data);
		} else {
			Object.prototype.toString.call(config.settle) === "[object Function]"
				? config.settle!(resolve, reject, data)
				: settle(resolve, reject, data);
		}
	});
}

async function getResponse(request: Request, config: AdapterConfig) {
	let stageOne;
	try {
		stageOne = await fetch(request);
	} catch (e) {
		return createError("Network Error", config, "ERR_NETWORK", request);
	}

	const response: AxiosResponse = {
		status: stageOne.status,
		statusText: stageOne.statusText,
		headers: new AxiosHeaders(Object.fromEntries(stageOne.headers.entries())), // Make a copy of headers
		config: config,
        request,
        data: undefined
	};

	if (stageOne.status >= 200 && stageOne.status !== 204) {
		switch (config.responseType) {
			case "arraybuffer":
				response.data = await stageOne.arrayBuffer();
				break;
			case "blob":
				response.data = await stageOne.blob();
				break;
			case "json":
				response.data = await stageOne.json();
                break;
            // @ts-ignore
			case "formData":
				response.data = await stageOne.formData();
				break;
			default:
				response.data = await stageOne.text();
				break;
		}
	}

	return response;
}

function createRequest(config: AdapterConfig) {
	const headers = new Headers(config.headers instanceof AxiosHeaders ? config.headers.toJSON() as HeadersInit : config.headers);

	// HTTP basic authentication
	if (config.auth) {
		const username = config.auth.username || "";
		const password = config.auth.password
			? decodeURI(encodeURIComponent(config.auth.password))
			: "";
		headers.set("Authorization", `Basic ${btoa(username + ":" + password)}`);
	}

	const method = config.method!.toUpperCase();
	const options: RequestInit = {
		headers: headers,
		method,
	};
	if (method !== "GET" && method !== "HEAD") {
		options.body = config.data;

		// In these cases the browser will automatically set the correct Content-Type,
		// but only if that header hasn't been set yet. So that's why we're deleting it.
		if (isFormData(options.body) && isStandardBrowserEnv()) {
			headers.delete("Content-Type");
		}
	}
	if (config.mode) {
		options.mode = config.mode;
	}
	if (config.cache) {
		options.cache = config.cache;
	}
	if (config.integrity) {
		options.integrity = config.integrity;
	}
	if (config.redirect) {
		options.redirect = config.redirect;
	}
	if (config.referrer) {
		options.referrer = config.referrer;
	}
	// This config is similar to XHR’s withCredentials flag, but with three available values instead of two.
	// So if withCredentials is not set, default value 'same-origin' will be used
	if (!isUndefined(config.withCredentials)) {
		options.credentials = config.withCredentials ? "include" : "omit";
	}

	const fullPath = buildFullPath(config.baseURL, config.url);
	const url = buildURL(fullPath, config.params, config.paramsSerializer);

	// Expected browser to throw error if there is any wrong configuration value
	return new Request(url, options);
}

function createError(message: string, config: AdapterConfig, code: keyof typeof axios.AxiosError, request: Request, response?: AxiosResponse) {
	if (axios.AxiosError && typeof axios.AxiosError === "function") {
		return new axios.AxiosError(message, axios.AxiosError[code] as string, config, request, response);
	}

	var error = new Error(message);
	return enhanceError(error as AxiosError, config, code, request, response);
}

function enhanceError(error: AxiosError & { description?: string, number?: number, fileName?: string, lineNumber?: number, columnNumber?: number }, config: AdapterConfig, code: keyof typeof axios.AxiosError, request: Request, response?: AxiosResponse) {
	error.config = config;
	if (code) {
		error.code = code;
	}

	error.request = request;
	error.response = response;
	error.isAxiosError = true;

	error.toJSON = function toJSON() {
		return {
			// Standard
			message: this.message,
			name: this.name,
			// Microsoft
			description: this.description,
			number: this.number,
			// Mozilla
			fileName: this.fileName,
			lineNumber: this.lineNumber,
			columnNumber: this.columnNumber,
			stack: this.stack,
			// Axios
			config: this.config,
			code: this.code,
			status: this.response && this.response.status ? this.response.status : null,
		};
	};
	return error;
}
