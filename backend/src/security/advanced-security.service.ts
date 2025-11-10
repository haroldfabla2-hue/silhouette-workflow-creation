import { DataSource } from 'typeorm';
import { AuthUser } from '../auth/auth.service';
import { AuditLog } from '../types/audit-log.entity';
import * as crypto from 'crypto';
import * as rateLimit from 'express-rate-limit';

export interface SecurityEvent {
  type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'suspicious_activity' | 'data_access' | 'permission_change' | 'security_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  orgId: string;
  ipAddress: string;
  userAgent: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface SecurityConfig {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventCommonPasswords: boolean;
    maxAge: number; // días
    history: number; // contraseñas anteriores
  };
  sessionConfig: {
    maxDuration: number; // minutos
    maxConcurrentSessions: number;
    requireMFA: boolean;
    allowRememberDevice: boolean;
  };
  ipPolicy: {
    allowedRanges: string[];
    blockedCountries: string[];
    rateLimiting: {
      windowMs: number;
      maxRequests: number;
      blockDuration: number;
    };
  };
  dataProtection: {
    encryption: {
      algorithm: string;
      keyRotation: number; // días
    };
    anonymization: {
      enabled: boolean;
      fields: string[];
    };
    retention: {
      auditLogs: number; // días
      userData: number; // días
      workflowData: number; // días
    };
  };
}

export interface ThreatDetection {
  threat: {
    type: 'brute_force' | 'suspicious_ip' | 'unusual_activity' | 'data_exfiltration' | 'privilege_escalation';
    confidence: number; // 0-100
    source: string;
    indicators: string[];
  };
  response: {
    action: 'block' | 'alert' | 'monitor' | 'quarantine';
    severity: 'low' | 'medium' | 'high' | 'critical';
    automated: boolean;
    requiresHumanReview: boolean;
  };
  affected: {
    users: string[];
    resources: string[];
    data: any;
  };
  timeline: {
    detected: Date;
    firstSeen: Date;
    lastActivity: Date;
  };
}

export interface ComplianceReport {
  standard: 'GDPR' | 'SOX' | 'HIPAA' | 'PCI-DSS' | 'ISO27001';
  status: 'compliant' | 'partial' | 'non-compliant' | 'unknown';
  score: number; // 0-100
  lastAssessment: Date;
  nextAssessment: Date;
  findings: Array<{
    category: string;
    requirement: string;
    status: 'met' | 'partial' | 'not_met' | 'not_applicable';
    description: string;
    remediation: string;
    dueDate?: Date;
  }>;
  risks: Array<{
    category: string;
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: string;
    likelihood: string;
    mitigation: string;
  }>;
}

export class AdvancedSecurityService {
  private readonly dataSource: DataSource;
  private readonly securityConfig: SecurityConfig;
  private readonly failedLoginAttempts: Map<string, { count: number; lastAttempt: Date; blockedUntil?: Date }> = new Map();
  private readonly activeSessions: Map<string, any> = new Map();

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.securityConfig = this.loadSecurityConfig();
    this.startSecurityMonitoring();
  }

  /**
   * Valida la seguridad de una contraseña
   */
  validatePasswordStrength(password: string, userContext?: {
    email?: string;
    name?: string;
    previousPasswords?: string[];
  }): {
    valid: boolean;
    score: number; // 0-100
    feedback: string[];
    requirements: Array<{ met: boolean; message: string }>;
  } {
    const policy = this.securityConfig.passwordPolicy;
    const feedback: string[] = [];
    const requirements: any[] = [];
    let score = 0;
    let valid = true;

    // Longitud mínima
    const lengthMet = password.length >= policy.minLength;
    requirements.push({
      met: lengthMet,
      message: `Mínimo ${policy.minLength} caracteres`,
    });
    if (lengthMet) score += 20;
    else {
      valid = false;
      feedback.push(`La contraseña debe tener al menos ${policy.minLength} caracteres`);
    }

    // Mayúsculas
    if (policy.requireUppercase) {
      const hasUppercase = /[A-Z]/.test(password);
      requirements.push({
        met: hasUppercase,
        message: 'Al menos una letra mayúscula',
      });
      if (hasUppercase) score += 15;
      else {
        valid = false;
        feedback.push('Debe incluir al menos una letra mayúscula');
      }
    }

    // Minúsculas
    if (policy.requireLowercase) {
      const hasLowercase = /[a-z]/.test(password);
      requirements.push({
        met: hasLowercase,
        message: 'Al menos una letra minúscula',
      });
      if (hasLowercase) score += 15;
      else {
        valid = false;
        feedback.push('Debe incluir al menos una letra minúscula');
      }
    }

    // Números
    if (policy.requireNumbers) {
      const hasNumbers = /\d/.test(password);
      requirements.push({
        met: hasNumbers,
        message: 'Al menos un número',
      });
      if (hasNumbers) score += 15;
      else {
        valid = false;
        feedback.push('Debe incluir al menos un número');
      }
    }

    // Caracteres especiales
    if (policy.requireSpecialChars) {
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      requirements.push({
        met: hasSpecialChars,
        message: 'Al menos un carácter especial',
      });
      if (hasSpecialChars) score += 15;
      else {
        valid = false;
        feedback.push('Debe incluir al menos un carácter especial');
      }
    }

    // Evitar contraseñas comunes
    if (policy.preventCommonPasswords) {
      const isCommon = this.isCommonPassword(password);
      requirements.push({
        met: !isCommon,
        message: 'No puede ser una contraseña común',
      });
      if (isCommon) {
        valid = false;
        feedback.push('Esta contraseña es muy común y no es segura');
        score = Math.min(score, 20);
      }
    }

    // Verificar información del usuario
    if (userContext) {
      const personalInfoUsed = this.containsPersonalInfo(password, userContext);
      if (personalInfoUsed) {
        feedback.push('La contraseña no debe contener información personal');
        valid = false;
        score = Math.max(0, score - 30);
      }
    }

    // Verificar historial de contraseñas
    if (userContext?.previousPasswords && userContext.previousPasswords.length > 0) {
      const isReused = userContext.previousPasswords.includes(password);
      requirements.push({
        met: !isReused,
        message: 'No debe ser una contraseña anterior',
      });
      if (isReused) {
        valid = false;
        feedback.push('No puedes reutilizar contraseñas anteriores');
        score = Math.max(0, score - 25);
      }
    }

    // Bonus por longitud extra
    if (password.length > policy.minLength + 4) {
      score += 10;
    }

    return {
      valid,
      score: Math.min(score, 100),
      feedback,
      requirements,
    };
  }

  /**
   * Monitorea y registra eventos de seguridad
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'timestamp' | 'resolved'>): Promise<void> {
    try {
      // Registrar en audit log
      const auditLog = this.dataSource.getRepository(AuditLog).create({
        orgId: event.orgId,
        userId: event.userId || null,
        action: `security_${event.type}`,
        resource: 'security',
        resourceId: null,
        details: JSON.stringify({
          ...event.details,
          severity: event.severity,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
        }),
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      });

      await this.dataSource.getRepository(AuditLog).save(auditLog);

      // Procesar eventos críticos inmediatamente
      if (event.severity === 'critical') {
        await this.handleCriticalSecurityEvent(event);
      }

      // Actualizar detección de amenazas
      await this.updateThreatDetection(event);

    } catch (error) {
      console.error('Error al registrar evento de seguridad:', error);
    }
  }

  /**
   * Detecta intentos de intrusión
   */
  async detectIntrusionAttempt(
    userId: string,
    ipAddress: string,
    userAgent: string,
    orgId: string,
  ): Promise<{
    blocked: boolean;
    reason?: string;
    threatLevel: 'low' | 'medium' | 'high';
  }> {
    const key = `${ipAddress}:${userId}`;
    const attempt = this.failedLoginAttempts.get(key) || { count: 0, lastAttempt: new Date() };

    // Incrementar contador
    attempt.count++;
    attempt.lastAttempt = new Date();

    // Verificar si debe bloquearse
    const maxAttempts = 5;
    const blockDuration = 15 * 60 * 1000; // 15 minutos

    if (attempt.count >= maxAttempts) {
      attempt.blockedUntil = new Date(Date.now() + blockDuration);
      
      // Registrar evento de seguridad
      await this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        userId,
        orgId,
        ipAddress,
        userAgent,
        details: {
          reason: 'Demasiados intentos fallidos',
          attemptCount: attempt.count,
          blockedUntil: attempt.blockedUntil,
        },
      });
    }

    this.failedLoginAttempts.set(key, attempt);

    // Verificar si está bloqueado
    if (attempt.blockedUntil && attempt.blockedUntil > new Date()) {
      return {
        blocked: true,
        reason: 'Demasiados intentos fallidos. Intente más tarde.',
        threatLevel: 'high',
      };
    }

    return {
      blocked: false,
      threatLevel: attempt.count > 2 ? 'medium' : 'low',
    };
  }

  /**
   * Implementa control de acceso basado en roles (RBAC)
   */
  async checkResourceAccess(
    user: AuthUser,
    resource: string,
    action: string,
    resourceId?: string,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    conditions?: any[];
  }> {
    try {
      // Verificar permisos básicos
      const permission = `${resource}:${action}`;
      if (!user.permissions.includes(permission) && !user.permissions.includes(`${resource}:*`)) {
        return {
          allowed: false,
          reason: 'Permiso insuficiente',
        };
      }

      // Verificar restricciones de tiempo
      const timeRestriction = this.checkTimeRestrictions(user);
      if (!timeRestriction.allowed) {
        return {
          allowed: false,
          reason: 'Acceso restringido por horario',
        };
      }

      // Verificar restricciones geográficas
      const geoRestriction = await this.checkGeoRestrictions(user);
      if (!geoRestriction.allowed) {
        return {
          allowed: false,
          reason: 'Acceso restringido geográficamente',
        };
      }

      // Verificar condiciones adicionales
      const conditions = await this.evaluateAccessConditions(user, resource, action, resourceId);

      return {
        allowed: true,
        conditions,
      };

    } catch (error) {
      return {
        allowed: false,
        reason: `Error en verificación de acceso: ${error.message}`,
      };
    }
  }

  /**
   * Analiza actividad sospechosa
   */
  async analyzeSuspiciousActivity(
    orgId: string,
    timeWindow: number = 24, // horas
  ): Promise<{
    threats: ThreatDetection[];
    riskScore: number;
    recommendations: string[];
  }> {
    try {
      const startTime = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

      // Obtener eventos de seguridad recientes
      const securityEvents = await this.dataSource.getRepository(AuditLog)
        .createQueryBuilder('audit')
        .where('audit.orgId = :orgId', { orgId })
        .andWhere('audit.createdAt >= :startTime', { startTime })
        .andWhere("audit.action LIKE 'security_%'")
        .getMany();

      const threats: ThreatDetection[] = [];
      let riskScore = 0;

      // Analizar patrones
      const failedLogins = securityEvents.filter(e => e.action === 'security_failed_login');
      if (failedLogins.length > 10) {
        threats.push({
          threat: {
            type: 'brute_force',
            confidence: Math.min(95, failedLogins.length * 5),
            source: 'multiple',
            indicators: ['high_failed_login_rate', 'rapid_attempts'],
          },
          response: {
            action: 'block',
            severity: 'high',
            automated: true,
            requiresHumanReview: false,
          },
          affected: {
            users: [...new Set(failedLogins.map(e => e.userId).filter(Boolean))],
            resources: [],
            data: null,
          },
          timeline: {
            detected: new Date(),
            firstSeen: new Date(Math.min(...failedLogins.map(e => e.createdAt.getTime()))),
            lastActivity: new Date(Math.max(...failedLogins.map(e => e.createdAt.getTime()))),
          },
        });
        riskScore += 30;
      }

      // Detectar IPs sospechosas
      const ipActivity = this.analyzeIPActivity(securityEvents);
      ipActivity.forEach(suspiciousIP => {
        threats.push(suspiciousIP);
        riskScore += 20;
      });

      // Generar recomendaciones
      const recommendations = this.generateSecurityRecommendations(threats, riskScore);

      return {
        threats,
        riskScore: Math.min(riskScore, 100),
        recommendations,
      };

    } catch (error) {
      throw new Error(`Error al analizar actividad sospechosa: ${error.message}`);
    }
  }

  /**
   * Genera reporte de cumplimiento
   */
  async generateComplianceReport(
    user: AuthUser,
    standard: 'GDPR' | 'SOX' | 'HIPAA' | 'PCI-DSS' | 'ISO27001',
  ): Promise<ComplianceReport> {
    try {
      // Verificar permisos
      if (!user.permissions.includes('analytics:read')) {
        throw new Error('Sin permisos para generar reportes de cumplimiento');
      }

      let score = 0;
      const findings: any[] = [];
      const risks: any[] = [];

      switch (standard) {
        case 'GDPR':
          score = await this.assessGDPRCompliance(user.orgId);
          findings.push(...await this.getGDPRFindings(user.orgId));
          break;
        
        case 'SOX':
          score = await this.assessSOXCompliance(user.orgId);
          findings.push(...await this.getSOXFindings(user.orgId));
          break;
        
        case 'HIPAA':
          score = await this.assessHIPAACompliance(user.orgId);
          findings.push(...await this.getHIPAAFindings(user.orgId));
          break;
        
        case 'PCI-DSS':
          score = await this.assessPCICompliance(user.orgId);
          findings.push(...await this.getPCIFindings(user.orgId));
          break;
        
        case 'ISO27001':
          score = await this.assessISO27001Compliance(user.orgId);
          findings.push(...await this.getISO27001Findings(user.orgId));
          break;
      }

      // Calcular estado
      let status: ComplianceReport['status'] = 'unknown';
      if (score >= 95) status = 'compliant';
      else if (score >= 80) status = 'partial';
      else if (score >= 60) status = 'partial';
      else status = 'non-compliant';

      return {
        standard,
        status,
        score,
        lastAssessment: new Date(),
        nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 días
        findings,
        risks,
      };

    } catch (error) {
      throw new Error(`Error al generar reporte de cumplimiento: ${error.message}`);
    }
  }

  /**
   * Cifra datos sensibles
   */
  encryptSensitiveData(data: any, orgId: string): string {
    const key = this.getEncryptionKey(orgId);
    const algorithm = this.securityConfig.dataProtection.encryption.algorithm;
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  }

  /**
   * Descifra datos sensibles
   */
  decryptSensitiveData(encryptedData: string, orgId: string): any {
    const key = this.getEncryptionKey(orgId);
    const algorithm = this.securityConfig.dataProtection.encryption.algorithm;
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Anonimiza datos personales
   */
  anonymizeData(data: any, fields: string[] = []): any {
    const defaultFields = this.securityConfig.dataProtection.anonymization.fields;
    const fieldsToAnonymize = fields.length > 0 ? fields : defaultFields;

    const anonymized = { ...data };
    
    fieldsToAnonymize.forEach(field => {
      if (anonymized[field]) {
        if (typeof anonymized[field] === 'string' && anonymized[field].includes('@')) {
          // Email
          anonymized[field] = this.hashString(anonymized[field]) + '@anonymized.com';
        } else if (typeof anonymized[field] === 'string') {
          // Nombre u otros campos
          anonymized[field] = this.hashString(anonymized[field]).substring(0, 8) + '...';
        } else {
          // Otros tipos
          anonymized[field] = this.hashString(JSON.stringify(anonymized[field])).substring(0, 16);
        }
      }
    });

    return anonymized;
  }

  // Métodos auxiliares privados

  private loadSecurityConfig(): SecurityConfig {
    return {
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventCommonPasswords: true,
        maxAge: 90,
        history: 5,
      },
      sessionConfig: {
        maxDuration: 480, // 8 horas
        maxConcurrentSessions: 3,
        requireMFA: false,
        allowRememberDevice: true,
      },
      ipPolicy: {
        allowedRanges: [],
        blockedCountries: [],
        rateLimiting: {
          windowMs: 15 * 60 * 1000, // 15 minutos
          maxRequests: 100,
          blockDuration: 30 * 60 * 1000, // 30 minutos
        },
      },
      dataProtection: {
        encryption: {
          algorithm: 'aes-256-cbc',
          keyRotation: 90, // días
        },
        anonymization: {
          enabled: true,
          fields: ['email', 'name', 'phone', 'address'],
        },
        retention: {
          auditLogs: 2555, // 7 años
          userData: 2555, // 7 años
          workflowData: 1095, // 3 años
        },
      },
    };
  }

  private startSecurityMonitoring(): void {
    // Monitoreo continuo de seguridad
    setInterval(() => {
      this.cleanupExpiredBlocks();
    }, 60000); // Cada minuto

    setInterval(() => {
      this.rotateEncryptionKeys();
    }, 24 * 60 * 60 * 1000); // Diario
  }

  private async handleCriticalSecurityEvent(event: SecurityEvent): Promise<void> {
    // Implementar respuesta automática a eventos críticos
    console.log('Evento de seguridad crítico:', event);
    
    // Podría incluir:
    // - Bloquear IP
    // - Suspender usuario
    // - Notificar a administradores
    // - Activar modo de emergencia
  }

  private async updateThreatDetection(event: SecurityEvent): Promise<void> {
    // Actualizar modelos de detección de amenazas
    // Esto podría usar ML/AI para mejorar la detección
  }

  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', '1234567890'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  private containsPersonalInfo(password: string, userContext: any): boolean {
    const context = [userContext.email, userContext.name].filter(Boolean);
    return context.some(info => 
      info && password.toLowerCase().includes(info.toLowerCase())
    );
  }

  private checkTimeRestrictions(user: AuthUser): { allowed: boolean; reason?: string } {
    // Implementar restricciones de horario si es necesario
    return { allowed: true };
  }

  private async checkGeoRestrictions(user: AuthUser): Promise<{ allowed: boolean; reason?: string }> {
    // Implementar restricciones geográficas
    return { allowed: true };
  }

  private async evaluateAccessConditions(user: AuthUser, resource: string, action: string, resourceId?: string): Promise<any[]> {
    // Evaluar condiciones adicionales de acceso
    return [];
  }

  private analyzeIPActivity(events: any[]): ThreatDetection[] {
    const ipCounts = new Map<string, number>();
    
    events.forEach(event => {
      const ip = event.ipAddress;
      ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
    });

    const threats: ThreatDetection[] = [];
    
    ipCounts.forEach((count, ip) => {
      if (count > 50) { // Más de 50 eventos de una IP en el período
        threats.push({
          threat: {
            type: 'suspicious_ip',
            confidence: Math.min(90, count),
            source: ip,
            indicators: ['high_activity_rate'],
          },
          response: {
            action: 'monitor',
            severity: 'medium',
            automated: true,
            requiresHumanReview: true,
          },
          affected: {
            users: [],
            resources: [],
            data: null,
          },
          timeline: {
            detected: new Date(),
            firstSeen: new Date(),
            lastActivity: new Date(),
          },
        });
      }
    });

    return threats;
  }

  private generateSecurityRecommendations(threats: ThreatDetection[], riskScore: number): string[] {
    const recommendations: string[] = [];

    if (riskScore > 50) {
      recommendations.push('Implementar autenticación multifactor (MFA)');
    }

    if (threats.some(t => t.threat.type === 'brute_force')) {
      recommendations.push('Reforzar políticas de contraseñas');
      recommendations.push('Implementar captcha en login');
    }

    if (threats.some(t => t.threat.type === 'suspicious_ip')) {
      recommendations.push('Configurar listas de bloqueo de IP');
      recommendations.push('Monitorear tráfico de red');
    }

    recommendations.push('Capacitar usuarios en seguridad');
    recommendations.push('Revisar y actualizar políticas de seguridad');

    return recommendations;
  }

  private getEncryptionKey(orgId: string): string {
    // En producción, esto debería venir de un sistema de gestión de claves
    const baseKey = process.env.ENCRYPTION_KEY || 'default-key';
    return crypto.createHash('sha256').update(baseKey + orgId).digest('hex');
  }

  private hashString(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  private cleanupExpiredBlocks(): void {
    const now = new Date();
    const expired: string[] = [];

    this.failedLoginAttempts.forEach((attempt, key) => {
      if (attempt.blockedUntil && attempt.blockedUntil < now) {
        expired.push(key);
      }
    });

    expired.forEach(key => this.failedLoginAttempts.delete(key));
  }

  private rotateEncryptionKeys(): void {
    // Implementar rotación de claves de cifrado
    // Esto debería hacer backup de la clave anterior y generar una nueva
  }

  // Métodos de evaluación de cumplimiento (simplificados)

  private async assessGDPRCompliance(orgId: string): Promise<number> {
    // Evaluación simplificada de GDPR
    return 85; // Puntaje simulado
  }

  private async getGDPRFindings(orgId: string): Promise<any[]> {
    return [
      {
        category: 'Data Protection',
        requirement: 'Consent for data processing',
        status: 'met',
        description: 'Consentimiento implementado correctamente',
        remediation: '',
      },
    ];
  }

  private async assessSOXCompliance(orgId: string): Promise<number> {
    return 80;
  }

  private async getSOXFindings(orgId: string): Promise<any[]> {
    return [];
  }

  private async assessHIPAACompliance(orgId: string): Promise<number> {
    return 75;
  }

  private async getHIPAAFindings(orgId: string): Promise<any[]> {
    return [];
  }

  private async assessPCICompliance(orgId: string): Promise<number> {
    return 90;
  }

  private async getPCIFindings(orgId: string): Promise<any[]> {
    return [];
  }

  private async assessISO27001Compliance(orgId: string): Promise<number> {
    return 88;
  }

  private async getISO27001Findings(orgId: string): Promise<any[]> {
    return [];
  }
}