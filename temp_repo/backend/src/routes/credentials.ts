import express from 'express';
import { CredentialService } from './credential.service';
import { AuthService } from '../auth/auth.service';
import { CredentialType, CredentialStatus } from '../types/credential-vault.entity';

const router = express.Router();
const credentialService = new CredentialService(null as any); // Se inicializará con dataSource
const authService = new AuthService(null as any); // Se inicializará con dataSource

// Middleware de autenticación
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido',
      error: 'MISSING_TOKEN',
    });
  }

  const user = await authService.validateToken(token);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido',
      error: 'INVALID_TOKEN',
    });
  }

  req.user = user;
  next();
};

// Crear credencial
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, type, serviceName, encryptedData, metadata, expiresAt, permissions } = req.body;
    
    if (!name || !type || !serviceName || !encryptedData) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, tipo, nombre de servicio y datos son requeridos',
        error: 'MISSING_FIELDS',
      });
    }

    const credential = await credentialService.createCredential(req.user, {
      name,
      description,
      type: type as CredentialType,
      serviceName,
      encryptedData,
      metadata,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      permissions,
    }, req.ip);

    res.status(201).json({
      success: true,
      message: 'Credencial creada exitosamente',
      data: credential,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: 'CREDENTIAL_CREATION_ERROR',
    });
  }
});

// Obtener lista de credenciales
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, serviceName, status } = req.query;
    
    const filters: any = {};
    if (type) filters.type = type;
    if (serviceName) filters.serviceName = serviceName;
    if (status) filters.status = status;

    const credentials = await credentialService.getCredentials(req.user, filters);

    res.json({
      success: true,
      data: credentials,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: 'CREDENTIALS_FETCH_ERROR',
    });
  }
});

// Obtener credencial por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const credential = await credentialService.getCredentialById(req.user, id);

    res.json({
      success: true,
      data: credential,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      error: 'CREDENTIAL_FETCH_ERROR',
    });
  }
});

// Desencriptar credencial
router.get('/:id/decrypt', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const decrypted = await credentialService.decryptCredential(req.user, id);

    res.json({
      success: true,
      message: 'Credencial desencriptada exitosamente',
      data: decrypted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: 'CREDENTIAL_DECRYPT_ERROR',
    });
  }
});

// Actualizar credencial
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, encryptedData, metadata, status, expiresAt, permissions } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (encryptedData !== undefined) updateData.encryptedData = encryptedData;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (status !== undefined) updateData.status = status;
    if (expiresAt !== undefined) updateData.expiresAt = new Date(expiresAt);
    if (permissions !== undefined) updateData.permissions = permissions;

    const credential = await credentialService.updateCredential(
      req.user,
      id,
      updateData,
      req.ip,
    );

    res.json({
      success: true,
      message: 'Credencial actualizada exitosamente',
      data: credential,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: 'CREDENTIAL_UPDATE_ERROR',
    });
  }
});

// Eliminar credencial
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await credentialService.deleteCredential(req.user, id, req.ip);

    res.status(204).json({
      success: true,
      message: 'Credencial eliminada exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: 'CREDENTIAL_DELETE_ERROR',
    });
  }
});

// Probar credencial
router.post('/:id/test', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await credentialService.testCredential(req.user, id);

    res.json({
      success: result.success,
      message: result.message,
      data: result.details,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: 'CREDENTIAL_TEST_ERROR',
    });
  }
});

// Obtener estadísticas
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await credentialService.getCredentialStats(req.user);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: 'CREDENTIAL_STATS_ERROR',
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'credentials',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;