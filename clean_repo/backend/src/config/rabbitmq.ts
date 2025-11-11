// RabbitMQ Configuration and Setup
import amqp from 'amqplib';

let connection: amqp.Connection;
let channel: amqp.Channel;

export const setupRabbitMQ = async (): Promise<void> => {
  try {
    const rabbitMqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    
    connection = await amqp.connect(rabbitMqUrl);
    channel = await connection.createChannel();

    // Set up exchange for workflow events
    await channel.assertExchange('silhouette.events', 'topic', { durable: true });
    console.log('✅ RabbitMQ connection established');
    
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err);
    });
    
  } catch (error) {
    console.error('❌ RabbitMQ setup failed:', error);
    console.warn('⚠️  RabbitMQ connection failed - some features may be limited');
    // Don't throw error to allow server to start without RabbitMQ
  }
};

export const getRabbitChannel = (): amqp.Channel | null => {
  return channel || null;
};

export const publishEvent = async (eventType: string, data: any): Promise<void> => {
  if (!channel) return;
  
  try {
    const message = Buffer.from(JSON.stringify({
      event: eventType,
      data,
      timestamp: new Date().toISOString()
    }));
    
    await channel.publish('silhouette.events', eventType, message, {
      persistent: true,
      contentType: 'application/json'
    });
  } catch (error) {
    console.error('Failed to publish event:', error);
  }
};

export const closeRabbitMQ = async (): Promise<void> => {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    console.log('🔒 RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
};