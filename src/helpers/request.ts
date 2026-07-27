import fetch from 'isomorphic-fetch';

import { Response as WLResponse } from '../types/response';

const parse = async <T>(response: Response): Promise<WLResponse<T>> => {
  const body = await response.text();
  let result: T | undefined;
  let parseFailed = false;

  try {
    result = JSON.parse(body);
  } catch (error) {
    parseFailed = true;
  }

  const parsedResponse: WLResponse<T> = {
    status: response.status,
    result: result as T,
    body,
  };

  // A non-JSON body (e.g. a captive-portal login page served with a 200)
  // is never a valid API response, even when response.ok is true.
  if (!response.ok || parseFailed) {
    return Promise.reject(parsedResponse);
  }

  return parsedResponse;
};

const request = async <T>(
  url: string,
  options: RequestInit,
): Promise<WLResponse<T>> => {
  const response = await fetch(url, options);
  return await parse<T>(response);
};

export default request;
