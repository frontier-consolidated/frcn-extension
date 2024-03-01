export type RequestPayload<T = unknown> = {
    id: string;
    type: string;
    message: T;
}

export type IntegrationPayload = {
    type: string;
    message: RequestPayload;
}