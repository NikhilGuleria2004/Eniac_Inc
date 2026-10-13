import { env } from "../config/env.js";

export interface MetaData {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data
  };
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): ApiResponse<T[]> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  };
}

export function errorResponse(
  code: string,
  message: string,
  fields?: Record<string, string[]>
): ErrorResponse {
  const error: { code: string; message: string; fields?: Record<string, string[]> } = {
    code,
    message
  };
  if (fields) {
    error.fields = fields;
  }
  return {
    success: false,
    error
  };
}

export const isProduction = (): boolean => env.NODE_ENV === "production";
