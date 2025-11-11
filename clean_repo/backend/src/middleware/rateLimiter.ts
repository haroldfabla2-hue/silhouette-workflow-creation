import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// General API rate limiter
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: 15 * 60 // 15 minutes in seconds
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: 15 * 60
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict rate limiter for password reset
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    error: {
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset attempts, please try again in an hour.',
      retryAfter: 60 * 60
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// WebSocket rate limiter (in-memory for demo)
const webSocketConnections = new Map<string, { count: number; resetTime: number }>();

export const checkWebSocketRateLimit = (socketId: string): boolean => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxConnections = 10; // max 10 connections per minute per socket
  
  const connection = webSocketConnections.get(socketId);
  
  if (!connection || now > connection.resetTime) {
    webSocketConnections.set(socketId, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (connection.count >= maxConnections) {
    return false;
  }
  
  connection.count++;
  return true;
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [socketId, connection] of webSocketConnections.entries()) {
    if (now > connection.resetTime) {
      webSocketConnections.delete(socketId);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes