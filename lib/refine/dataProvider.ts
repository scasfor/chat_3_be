"use client";

import buildSimpleRestDataProvider from "@refinedev/simple-rest";
import axios from "axios";

const axiosInstance = axios.create({ withCredentials: true });

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const customError = {
      ...error,
      message: error?.response?.data?.message ?? error.message,
      statusCode: error?.response?.status,
    };
    return Promise.reject(customError);
  },
);

/**
 * All /admin resources are served by our own Route Handlers under
 * /api/admin/*, following the json-server-ish conventions that
 * @refinedev/simple-rest expects (_start/_end/_sort/_order, X-Total-Count).
 */
export const dataProvider = buildSimpleRestDataProvider("/api/admin", axiosInstance);
