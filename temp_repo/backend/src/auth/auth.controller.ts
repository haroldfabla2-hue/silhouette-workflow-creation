import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Ip,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, LoginCredentials, RegisterData, AuthUser } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './get-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registro de nuevo usuario
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerData: RegisterData,
    @Ip() ip: string,
  ) {
    try {
      const result = await this.authService.register(registerData, ip);
      
      return {
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'REGISTRATION_ERROR',
      };
    }
  }

  /**
   * Login de usuario existente
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() credentials: LoginCredentials,
    @Ip() ip: string,
  ) {
    try {
      const result = await this.authService.login(credentials, ip);
      
      return {
        success: true,
        message: 'Login exitoso',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'LOGIN_ERROR',
      };
    }
  }

  /**
   * Refrescar token de acceso
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    try {
      const tokens = await this.authService.refreshToken(refreshToken);
      
      return {
        success: true,
        message: 'Token refrescado exitosamente',
        data: tokens,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'REFRESH_TOKEN_ERROR',
      };
    }
  }

  /**
   * Logout de usuario
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @GetUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    try {
      await this.authService.logout(user.id, user.orgId, ip);
      
      return {
        success: true,
        message: 'Logout exitoso',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'LOGOUT_ERROR',
      };
    }
  }

  /**
   * Cambiar contraseña
   */
  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @GetUser() user: AuthUser,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
    @Ip() ip: string,
  ) {
    try {
      await this.authService.changePassword(
        user.id,
        currentPassword,
        newPassword,
        ip,
      );
      
      return {
        success: true,
        message: 'Contraseña cambiada exitosamente',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'PASSWORD_CHANGE_ERROR',
      };
    }
  }

  /**
   * Obtener perfil de usuario actual
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: AuthUser) {
    try {
      const currentUser = await this.authService.getCurrentUser(user.id);
      
      if (!currentUser) {
        return {
          success: false,
          message: 'Usuario no encontrado',
          error: 'USER_NOT_FOUND',
        };
      }
      
      return {
        success: true,
        data: currentUser,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'PROFILE_ERROR',
      };
    }
  }

  /**
   * Actualizar perfil de usuario
   */
  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @GetUser() user: AuthUser,
    @Body() updates: { name?: string; settings?: any },
    @Ip() ip: string,
  ) {
    try {
      const updatedUser = await this.authService.updateProfile(
        user.id,
        updates,
        ip,
      );
      
      return {
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: updatedUser,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'PROFILE_UPDATE_ERROR',
      };
    }
  }

  /**
   * Verificar token válido
   */
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyToken(@GetUser() user: AuthUser) {
    return {
      success: true,
      message: 'Token válido',
      data: {
        user,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Health check para autenticación
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return {
      success: true,
      service: 'auth',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}