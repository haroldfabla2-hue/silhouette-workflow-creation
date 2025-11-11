import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RequestWithStartTime extends Request {
  startTime?: number;
}

export const requestLogger = (req: RequestWithStartTime, res: Response, next: NextFunction): void => {
  // Record start time
  req.startTime = Date.now();
  
  // Get request info
  const { method, url, ip, headers } = req;
  const userAgent = headers['user-agent'] || 'Unknown';
  const contentType = headers['content-type'] || 'None';
  
  // Log request start
  logger.info({
    event: 'REQUEST_START',
    method,
    url,
    ip,
    userAgent,
    contentType,
    timestamp: new Date().toISOString()
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding?: any) {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    
    // Log response
    const logData = {
      event: 'REQUEST_END',
      method,
      url,
      ip,
      userAgent,
      contentType,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
      contentLength: res.get('content-length') || chunk ? Buffer.byteLength(chunk) : 0
    };
    
    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error(logData);
    } else if (res.statusCode >= 400) {
      logger.warn(logData);
    } else {
      logger.info(logData);
    }
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Structured logging for specific events
export const logWorkflowExecution = (workflowId: string, action: string, details: any): void => {
  logger.info({
    event: 'WORKFLOW_EXECUTION',
    workflowId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logUserAction = (userId: string, action: string, details: any): void => {
  logger.info({
    event: 'USER_ACTION',
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logSecurityEvent = (event: string, details: any): void => {
  logger.warn({
    event: 'SECURITY_EVENT',
    type: event,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logSystemEvent = (event: string, details: any): void => {
  logger.info({
    event: 'SYSTEM_EVENT',
    type: event,
    details,
    timestamp: new Date().toISOString()
  });
};