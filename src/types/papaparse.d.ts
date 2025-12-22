/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'papaparse' {
  export interface ParseResult<T> {
    data: T[];
    errors: any[];
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      fields?: string[];
      truncated: boolean;
    };
  }

  export interface ParseConfig {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    header?: boolean;
    skipEmptyLines?: boolean | 'greedy';
    transformHeader?: (header: string) => string;
    transform?: (value: any, field: string | number) => any;
    dynamicTyping?: boolean;
    complete?: (result: ParseResult<any>, file: any) => void;
    error?: (error: any, file: any) => void;
    download?: boolean;
    downloadRequestHeaders?: any;
    encoding?: string;
    worker?: boolean;
    step?: (row: ParseResult<any>, parser: any) => void;
    chunk?: (chunk: ParseResult<any>, parser: any) => void;
    chunkSize?: number;
    fastMode?: boolean;
    beforeFirstChunk?: (chunk: string) => string;
    preview?: number;
    previewParser?: (chunk: string) => any;
    comments?: boolean;
    delimitersToGuess?: string[];
  }

  export interface UnparseConfig {
    quotes?: boolean | boolean[];
    quoteChar?: string;
    escapeChar?: string;
    delimiter?: string;
    header?: boolean;
    newline?: string;
    skipEmptyLines?: boolean | 'greedy';
    columns?: string[] | false;
  }

  export function parse<T = any>(input: string | File, config?: ParseConfig): ParseResult<T>;
  export function unparse(data: any[], config?: UnparseConfig): string;
  export const Papa: {
    parse: typeof parse;
    unparse: typeof unparse;
    BAD_DELIMITERS: string[];
    RECORD_SEP: string;
    UNIT_SEP: string;
    WORKERS_SUPPORTED: boolean;
    LocalStorage: any;
  };
}
