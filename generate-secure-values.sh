#!/bin/bash

# ==================================================
# GENERADOR DE VALORES SEGUROS - SILHOUETTE
# ==================================================
# Este script genera valores seguros para la configuración
# de Silhouette Workflow Creation Platform

echo "🔐 Generando valores seguros para Silhouette..."
echo "=================================================="

# Generar contraseña PostgreSQL
POSTGRES_PASSWORD=$(openssl rand -base64 32)
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"

# Generar contraseña Redis
REDIS_PASSWORD=$(openssl rand -base64 32)
echo "REDIS_PASSWORD=$REDIS_PASSWORD"

# Generar contraseña Neo4j
NEO4J_PASSWORD=$(openssl rand -base64 32)
echo "NEO4J_PASSWORD=$NEO4J_PASSWORD"

# Generar contraseña RabbitMQ
RABBITMQ_PASSWORD=$(openssl rand -base64 32)
echo "RABBITMQ_PASSWORD=$RABBITMQ_PASSWORD"

# Generar JWT Secret Key
JWT_SECRET_KEY=$(openssl rand -base64 48)
echo "JWT_SECRET_KEY=$JWT_SECRET_KEY"

# Generar Encryption Key
ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"

echo ""
echo "✅ ¡Valores generados exitosamente!"
echo "📋 Copia estos valores en tu archivo .env"
echo ""
echo "💾 Para guardar en archivo:"
echo "openssl rand -base64 32"
echo "openssl rand -base64 48"