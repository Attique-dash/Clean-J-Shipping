declare module '@paypal/checkout-server-sdk' {
  export interface PayPalEnvironment {
    baseUrl: string;
  }

  export class LiveEnvironment implements PayPalEnvironment {
    constructor(clientId: string, clientSecret: string);
    baseUrl: string;
  }

  export class SandboxEnvironment implements PayPalEnvironment {
    constructor(clientId: string, clientSecret: string);
    baseUrl: string;
  }

  export interface PayPalResponse {
    statusCode: number;
    result: Record<string, unknown>;
  }

  export class PayPalHttpClient {
    constructor(environment: PayPalEnvironment);
    execute(request: PayPalHttpRequest): Promise<PayPalResponse>;
  }

  export class PayPalHttpRequest {
    constructor(path: string, verb: string);
  }

  export interface PayPalOrder {
    intent: string;
    purchase_units: Array<{
      amount: {
        currency_code: string;
        value: string;
      };
    }>;
  }

  export class OrdersCreateRequest extends PayPalHttpRequest {
    constructor();
    requestBody(order: PayPalOrder): void;
  }

  export class OrdersCaptureRequest extends PayPalHttpRequest {
    constructor(orderId: string);
  }

  export const core: {
    LiveEnvironment: typeof LiveEnvironment;
    SandboxEnvironment: typeof SandboxEnvironment;
    PayPalHttpClient: typeof PayPalHttpClient;
  };

  export function ordersCreateRequest(): OrdersCreateRequest;
  export function ordersCaptureRequest(orderId: string): OrdersCaptureRequest;
}
