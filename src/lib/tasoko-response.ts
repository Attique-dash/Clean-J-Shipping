export interface TasokoResponse {
  status: 'success' | 'error';
  code: number;
  message: string;
  data?: any;
  meta?: {
    timestamp: string;
    request_id?: string;
    api_version: string;
  };
}

export class TasokoResponseFormatter {
  /**
   * Format successful response
   */
  static success(
    data: any,
    message: string = 'Request successful',
    code: number = 200
  ): TasokoResponse {
    return {
      status: 'success',
      code,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        api_version: 'v1',
      },
    };
  }

  /**
   * Format error response
   */
  static error(
    message: string,
    code: number = 400,
    details?: any
  ): TasokoResponse {
    return {
      status: 'error',
      code,
      message,
      data: details,
      meta: {
        timestamp: new Date().toISOString(),
        api_version: 'v1',
      },
    };
  }

  /**
   * Convert to NextResponse JSON
   */
  static toJSON(response: TasokoResponse, httpStatus: number = response.code) {
    return new Response(JSON.stringify(response), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-warehouse-key, x-api-key',
      },
    });
  }
}

