# Tutorial Completo: Creación de Workflows en Silhouette

## 🎯 Objetivo del Tutorial

Este tutorial te guiará paso a paso para crear workflows complejos en Silhouette Workflow Platform. Al final, habrás creado tres workflows de diferentes niveles de complejidad:

1. **Básico**: Processing de datos de formularios
2. **Intermedio**: Sincronización de datos con APIs externas  
3. **Avanzado**: Workflow inteligente con IA y auto-scaling

---

## 🏗️ Fundamentos del Editor de Workflows

### Interface del Editor

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔄 Silhouette Workflow Designer                           [💾 Save] [▶️ Run]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ Nodes Panel ─┐  ┌────────────────── Canvas ──────────────────┐  ┌─ Prop. ─┐ │
│  │               │  │                                         │  │ Panel   │ │
│  │ 📋 General    │  │  [●] Start      [📡] API         [📤] End │  │         │ │
│  │ ├ Start       │  │     │               │                │    │  ┌─────┐ │ │
│  │ ├ End         │  │     ▼               ▼                │    │  │Node │ │ │
│  │ ├ Manual      │  │  [🔄] Logic    [💾] Store              │    │  │Selec│ │ │
│  │ └ ✓           │  │     │               │                │    │  │ted  │ │ │
│  │               │  │     ▼               ▼                │    │  └─────┘ │ │
│  │ 🔌 Connectors │  │  [📊] Transform  [❌] Error            │    │         │ │
│  │ ├ HTTP        │  │                                         │    │  ⚙️ Config │ │
│  │ ├ Webhook     │  │                                         │  │         │ │
│  │ ├ Database    │  │                                         │  │  🔗 Flow │ │
│  │ ├ Email       │  │                                         │  │  [Start] │ │
│  │ └ ✓           │  │                                         │  │  ──────── │ │
│  │               │  │                                         │  │  [Logic] │ │
│  │ 🧠 AI/ML      │  │                                         │  │  ──────── │ │
│  │ ├ ML Model    │  │                                         │  │  [API]   │ │
│  │ ├ Predict     │  │                                         │  │  ──────── │ │
│  │ └ ✓           │  │                                         │  │  [End]   │ │
│  │               │  │                                         │  │         │ │
│  │ 📊 Data       │  │                                         │  │  📈 Stats│ │
│  │ ├ Transform   │  │                                         │  │  ⏱️ Time │ │
│  │ ├ Filter      │  │                                         │  │  🐛 Debug│ │
│  │ └ ✓           │  │                                         │  │         │ │
│  └───────────────┘  └─────────────────────────────────────────┘  └─────────┘ │
│                                                                             │
│  Status: Ready   │  Last Saved: 2 min ago  │  Validation: ✅ Pass         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tipos de Nodos

#### 1. Nodos de Control
- **Start**: Punto de entrada del workflow
- **End**: Punto de salida
- **Manual**: Intervención manual requerida
- **Error**: Manejo de errores

#### 2. Nodos de Conectores
- **HTTP/HTTPS**: Solicitudes web
- **Webhook**: Recibir datos de terceros
- **Database**: Conectar con bases de datos
- **Email**: Envío de correos
- **FTP/SFTP**: Transferencia de archivos

#### 3. Nodos de Datos
- **Transform**: Transformar datos
- **Filter**: Filtrar datos
- **Sort**: Ordenar datos
- **Aggregate**: Agregar datos

#### 4. Nodos de Lógica
- **Switch**: Condicional simple
- **Router**: Enrutamiento múltiple
- **Loop**: Bucles
- **Parallel**: Ejecución paralela

#### 5. Nodos de IA/ML
- **ML Model**: Predicciones
- **Optimization**: Optimización de workflows
- **Auto-scale**: Escalado inteligente

---

## 📝 Workflow Básico: Procesamiento de Formularios

### Descripción
Crear un workflow que procese datos de formularios, valide la información, la almacene en base de datos y envíe confirmación por email.

### Objetivo de Negocio
Automatizar el procesamiento de solicitudes de soporte técnico de clientes.

### Diagrama del Workflow
```
[Webhook] → [Validate] → [Transform] → [Database] → [Send Email] → [End]
    ↓           ↓            ↓           ↓           ↓
   Input    Validation   Formatting   Storage    Notification
```

### Paso 1: Crear el Proyecto

1. Ve a **Workflows → Crear Workflow**
2. Selecciona **"Workflow Vacío"**
3. Configura la información básica:
   ```
   Nombre: "Procesamiento de Formularios de Soporte"
   Descripción: "Procesa solicitudes de soporte técnico de clientes"
   Categoría: "Customer Service"
   Tags: formulario, soporte, email
   ```

### Paso 2: Configurar Nodo Webhook

1. **Agregar nodo Webhook**:
   - Arrastra el nodo **"Webhook"** desde el panel **"Connectors"**
   - Colócalo en la parte izquierda del canvas

2. **Configurar propiedades**:
   ```
   General:
     Nombre: "Webhook de Formulario"
     Descripción: "Recibir datos del formulario de soporte"
   
   Webhook Settings:
     Method: POST
     Path: /support-form
     Authentication: None
     Rate Limit: 100 requests/hour
   
   Data Structure:
     {
       "customer_name": "string (required)",
       "customer_email": "email (required)",
       "ticket_title": "string (required)",
       "ticket_description": "text (required)",
       "priority": "low|medium|high|urgent",
       "category": "billing|technical|general"
     }
   
   Validation:
     ✓ Required fields check
     ✓ Email format validation
     ✓ JSON schema validation
   ```

3. **Conectar con Start**:
   - Conecta el nodo **Start** → **Webhook**

### Paso 3: Configurar Validación

1. **Agregar nodo de validación**:
   - Arrastra el nodo **"Filter"** desde **"Data"**
   - Conecta **Webhook** → **Filter**

2. **Configurar reglas de validación**:
   ```
   Filter Rules:
     Rule 1: customer_name.length > 0
     Rule 2: customer_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
     Rule 3: ticket_title.length >= 5
     Rule 4: ticket_description.length >= 20
     Rule 5: priority in ['low', 'medium', 'high', 'urgent']
     Rule 6: category in ['billing', 'technical', 'general']
   
   On Valid: Continue to next node
   On Invalid: 
     - Log error
     - Send response: "Datos de formulario inválidos"
     - Route to Error node
   ```

### Paso 4: Transformar Datos

1. **Agregar nodo Transform**:
   - Arrastra el nodo **"Transform"** desde **"Data"**
   - Conecta **Filter** → **Transform**

2. **Configurar transformación**:
   ```
   Input: {{webhook_data}}
   
   Transform Function:
   {
     "ticket_id": "TKT-" + Date.now(),
     "customer": {
       "name": input.customer_name.trim(),
       "email": input.customer_email.toLowerCase()
     },
     "request": {
       "title": input.ticket_title,
       "description": input.ticket_description,
       "category": input.category,
       "priority": input.priority
     },
     "metadata": {
       "created_at": new Date().toISOString(),
       "source": "web_form",
       "ip_address": "{{request.ip}}",
       "user_agent": "{{request.user_agent}}"
     },
     "status": "new"
   }
   ```

### Paso 5: Almacenar en Base de Datos

1. **Agregar nodo Database**:
   - Arrastra el nodo **"Database"** desde **"Connectors"**
   - Conecta **Transform** → **Database**

2. **Configurar conexión**:
   ```
   Database Type: PostgreSQL
   Connection:
     Host: postgres
     Port: 5432
     Database: haasdb
     User: haas
     Password: haaspass
     SSL: false
   
   Table: support_tickets
   
   Insert Query:
   INSERT INTO support_tickets (
     ticket_id, customer_name, customer_email, 
     title, description, category, priority, 
     status, created_at, metadata
   ) VALUES (
     {{transform_data.ticket_id}},
     {{transform_data.customer.name}},
     {{transform_data.customer.email}},
     {{transform_data.request.title}},
     {{transform_data.request.description}},
     {{transform_data.request.category}},
     {{transform_data.request.priority}},
     {{transform_data.status}},
     {{transform_data.metadata.created_at}},
     {{JSON.stringify(transform_data.metadata)}}
   )
   
   Return: ticket_id
   ```

### Paso 6: Enviar Email de Confirmación

1. **Agregar nodo Email**:
   - Arrastra el nodo **"Email"** desde **"Connectors"**
   - Conecta **Database** → **Email**

2. **Configurar email**:
   ```
   SMTP Configuration:
     Server: smtp.gmail.com
     Port: 587
     Security: STARTTLS
     Username: noreply@tuempresa.com
     Password: {{EMAIL_PASSWORD}}
   
   Email Settings:
     From: soporte@tuempresa.com
     To: {{transform_data.customer.email}}
     Subject: "Confirmación: Ticket #{{db_result.ticket_id}}"
   
   Template (HTML):
   <!DOCTYPE html>
   <html>
   <head>
     <title>Confirmación de Ticket</title>
     <style>
       .header { background: #2563eb; color: white; padding: 20px; }
       .content { padding: 20px; }
       .ticket-info { background: #f3f4f6; padding: 15px; margin: 10px 0; }
       .footer { background: #f9fafb; padding: 15px; text-align: center; }
     </style>
   </head>
   <body>
     <div class="header">
       <h1>Ticket de Soporte Creado</h1>
     </div>
     <div class="content">
       <p>Hola {{transform_data.customer.name}},</p>
       <p>Hemos recibido tu solicitud de soporte y hemos creado el siguiente ticket:</p>
       
       <div class="ticket-info">
         <strong>ID de Ticket:</strong> {{db_result.ticket_id}}<br>
         <strong>Título:</strong> {{transform_data.request.title}}<br>
         <strong>Prioridad:</strong> {{transform_data.request.priority}}<br>
         <strong>Categoría:</strong> {{transform_data.request.category}}<br>
         <strong>Estado:</strong> {{transform_data.status}}
       </div>
       
       <p>Nuestro equipo de soporte revisará tu solicitud y te contactará pronto.</p>
       <p>Puedes hacer seguimiento de tu ticket en: <a href="https://soporte.tuempresa.com/ticket/{{db_result.ticket_id}}">https://soporte.tuempresa.com/ticket/{{db_result.ticket_id}}</a></p>
     </div>
     <div class="footer">
       <p>Si tienes preguntas, responde a este email.</p>
       <p>© 2025 Tu Empresa S.L. - Equipo de Soporte</p>
     </div>
   </body>
   </html>
   ```

### Paso 7: Configurar Manejo de Errores

1. **Agregar nodo de Error**:
   - Arrastra el nodo **"Error"** al canvas
   - Conecta todos los puntos de fallo → **Error**

2. **Configurar Error Handler**:
   ```
   Error Actions:
     1. Log error details
     2. Send notification to admin
     3. Return error response to client
   
   Notification Email:
     To: admin@tuempresa.com
     Subject: "Error en Workflow: Procesamiento de Formularios"
     Body: Error details and workflow context
   ```

### Paso 8: Validar y Probar

1. **Validar workflow**:
   - Haz clic en **"Validar"** 
   - Revisa que no hay errores de configuración

2. **Probar con datos de ejemplo**:
   ```json
   {
     "customer_name": "Juan Pérez",
     "customer_email": "juan@cliente.com",
     "ticket_title": "Error en login",
     "ticket_description": "No puedo iniciar sesión desde hace 2 horas",
     "priority": "high",
     "category": "technical"
   }
   ```

3. **Publicar workflow**:
   - Haz clic en **"Publicar"**
   - El webhook estará disponible en: `https://tuempresa.com/api/support-form`

### Resultado del Workflow Básico

```
✅ Workflow Creado: "Procesamiento de Formularios de Soporte"
🔗 Webhook URL: https://tuempresa.com/api/support-form
📊 Estado: Activo
⏱️ Tiempo de procesamiento: ~2.3 segundos
📧 Email enviado: ✅ Confirmación automática
💾 Datos almacenados: ✅ En base de datos
```

---

## 🌐 Workflow Intermedio: Sincronización de Datos con APIs

### Descripción
Crear un workflow que sincronice datos de clientes entre Salesforce y un sistema interno, maneje conflictos y notifique cambios importantes.

### Objetivo de Negocio
Mantener sincronización automática de datos de clientes entre sistemas empresariales.

### Diagrama del Workflow
```
[Scheduler] → [Fetch Salesforce] → [Fetch Internal] → [Compare] → [Update/Sync] → [Log Changes] → [Send Report] → [End]
     ↓              ↓                  ↓              ↓           ↓              ↓              ↓
  Time-based    API Call          Database       Logic     Conflicts      Audit         Admin
  Trigger       OAuth2            Query         Rules      Resolution     Trail         Notification
```

### Paso 1: Configurar Programación

1. **Agregar nodo Scheduler**:
   - Arrastra el nodo **"Manual"** (cambia a Scheduler)
   - Configura:
   ```
   Schedule Type: Cron
   Cron Expression: "0 2 * * *" (2:00 AM daily)
   Timezone: UTC
   Description: "Daily customer sync at 2 AM"
   ```

### Paso 2: Configurar Conexión con Salesforce

1. **Agregar nodo HTTP Request**:
   - Nombre: "Fetch Salesforce Customers"
   - Conectar **Scheduler** → **HTTP Request**

2. **Configurar Salesforce API**:
   ```
   HTTP Configuration:
     Method: GET
     URL: https://your-instance.salesforce.com/services/data/v57.0/query/
     Authentication: OAuth 2.0
   
   OAuth 2.0 Settings:
     Client ID: {{SF_CLIENT_ID}}
     Client Secret: {{SF_CLIENT_SECRET}}
     Access Token: {{SF_ACCESS_TOKEN}}
     Token Refresh: Auto-refresh enabled
   
   Query Parameters:
     q: SELECT Id, Name, Email, Phone, AccountId, CreatedDate, LastModifiedDate FROM Contact WHERE Email != null
   
   Headers:
     Authorization: Bearer {{sf_access_token}}
     Content-Type: application/json
   
   Response Handling:
     Pagination: Automatic
     Retry Logic: 3 attempts with exponential backoff
     Rate Limiting: Respect Salesforce API limits
   ```

### Paso 3: Obtener Datos Internos

1. **Agregar nodo Database Query**:
   - Nombre: "Fetch Internal Customers"
   - Conectar **HTTP Request** → **Database Query**

2. **Configurar consulta**:
   ```
   Database: PostgreSQL
   Query:
   SELECT 
     id, 
     salesforce_id, 
     name, 
     email, 
     phone, 
     account_id,
     created_at,
     updated_at,
     sync_status
   FROM customers 
   WHERE email IS NOT NULL
   ORDER BY updated_at DESC;
   
   Connection: Internal DB (haasdb)
   ```

### Paso 4: Comparar y Detectar Cambios

1. **Agregar nodo Transform**:
   - Nombre: "Compare Data Sources"
   - Conectar **Database Query** → **Transform**

2. **Configurar lógica de comparación**:
   ```
   Input:
     salesforce_data: {{http_request.response.records}}
     internal_data: {{db_query.result}}
   
   Comparison Logic:
   {
     // Identificar registros nuevos
     new_records: salesforce_data.filter(sf => 
       !internal_data.find(int => int.salesforce_id === sf.Id)
     ),
     
     // Identificar registros actualizados
     updated_records: salesforce_data.filter(sf => {
       const internal = internal_data.find(int => int.salesforce_id === sf.Id);
       return internal && new Date(sf.LastModifiedDate) > new Date(internal.updated_at);
     }),
     
     // Identificar registros eliminados
     deleted_records: internal_data.filter(int => 
       !salesforce_data.find(sf => sf.Id === int.salesforce_id) && int.sync_status !== 'deleted'
     ),
     
     // Identificar conflictos
     conflicts: salesforce_data.filter(sf => {
       const internal = internal_data.find(int => int.salesforce_id === sf.Id);
       return internal && (
         sf.Name !== internal.name ||
         sf.Email !== internal.email ||
         sf.Phone !== internal.phone
       );
     })
   }
   
   Output: {
     sync_summary: {
       total_salesforce: salesforce_data.length,
       total_internal: internal_data.length,
       new_records: new_records.length,
       updated_records: updated_records.length,
       deleted_records: deleted_records.length,
       conflicts: conflicts.length
     },
     changes: {
       to_create: new_records,
       to_update: updated_records,
       to_delete: deleted_records,
       conflicts: conflicts
     }
   }
   ```

### Paso 5: Resolver Conflictos

1. **Agregar nodo Router**:
   - Nombre: "Route by Change Type"
   - Conectar **Transform** → **Router**

2. **Configurar enrutamiento**:
   ```
   Routes:
     Route 1: "has_conflicts && conflicts.length > 0"
       → Conflict Resolution
     
     Route 2: "has_changes && conflicts.length === 0"
       → Apply Changes
     
     Route 3: "no_changes"
       → Log No Changes
   
   Default Route: Log Unexpected Data
   ```

### Paso 6: Resolución de Conflictos

1. **Agregar nodo Switch**:
   - Nombre: "Conflict Resolution Strategy"
   - Conectar **Router** → **Switch**

2. **Configurar estrategias**:
   ```
   Conflict Resolution Options:
   
   Option 1: "Salesforce as Source of Truth"
     - Always prefer Salesforce data
     - Log override decision
     - Auto-apply changes
   
   Option 2: "Internal as Source of Truth"
     - Always prefer internal data
     - Log override decision
     - Sync back to Salesforce
   
   Option 3: "Manual Review Required"
     - Create review task
     - Pause sync process
     - Notify admin for manual resolution
   
   Option 4: "Timestamp-based Resolution"
     - Compare LastModifiedDate vs updated_at
     - Use most recent data
     - Log resolution decision
   
   Configuration:
   Resolution Strategy: {{WORKFLOW_CONFIG.conflict_strategy}}
   Review Required: conflicts.length > 5 || critical_fields_changed
   Notification: admin@tuempresa.com
   ```

### Paso 7: Aplicar Sincronización

1. **Agregar nodos paralelos**:
   - **Create Records**: Para registros nuevos
   - **Update Records**: Para registros actualizados
   - **Delete Records**: Para registros eliminados

2. **Configurar Create Records**:
   ```
   Database Operation: INSERT
   Query:
   INSERT INTO customers (
     salesforce_id, name, email, phone, 
     account_id, created_at, updated_at, 
     sync_status, last_sync_at
   ) VALUES (
     {{change.salesforce_id}},
     {{change.Name}},
     {{change.Email}},
     {{change.Phone}},
     {{change.AccountId}},
     NOW(),
     NOW(),
     'active',
     NOW()
   );
   
   Batch Size: 100
   Continue on Error: false
   Error Handling: Log and continue with next batch
   ```

3. **Configurar Update Records**:
   ```
   Database Operation: UPDATE
   Query:
   UPDATE customers SET 
     name = {{change.Name}},
     email = {{change.Email}},
     phone = {{change.Phone}},
     account_id = {{change.AccountId}},
     updated_at = NOW(),
     last_sync_at = NOW(),
     sync_status = 'active'
   WHERE salesforce_id = {{change.Id}};
   
   Batch Size: 100
   Continue on Error: false
   ```

4. **Configurar Delete Records**:
   ```
   Database Operation: UPDATE (soft delete)
   Query:
   UPDATE customers SET 
     sync_status = 'deleted',
     deleted_at = NOW(),
     updated_at = NOW()
   WHERE salesforce_id = {{change.salesforce_id}};
   
   Backup First: true
   Retention Period: 30 days
   ```

### Paso 8: Logging y Auditoría

1. **Agregar nodo Database (Log Table)**:
   - Nombre: "Log Sync Results"
   - Conectar **Switch** → **Database (Log)**

2. **Configurar logging**:
   ```
   Table: customer_sync_log
   
   Log Query:
   INSERT INTO customer_sync_log (
     sync_date, workflow_id, sync_type,
     records_processed, records_created, records_updated, 
     records_deleted, conflicts_found, conflicts_resolved,
     execution_time_ms, status, details
   ) VALUES (
     NOW(),
     '{{workflow.id}}',
     'scheduled_daily',
     {{summary.total_processed}},
     {{summary.created_count}},
     {{summary.updated_count}},
     {{summary.deleted_count}},
     {{summary.conflicts_count}},
     {{summary.conflicts_resolved}},
     {{execution_time}},
     '{{status}}',
     '{{JSON.stringify(summary)}}'
   );
   ```

### Paso 9: Generar Reportes

1. **Agregar nodo Email**:
   - Nombre: "Send Sync Report"
   - Conectar **Database (Log)** → **Email**

2. **Configurar reporte**:
   ```
   Recipients: 
     - admin@tuempresa.com
     - data-team@tuempresa.com
   
   Subject: "Reporte de Sincronización - {{date}}"
   
   Email Template:
   <html>
   <head>
     <title>Reporte de Sincronización de Clientes</title>
     <style>
       .summary-table { border-collapse: collapse; width: 100%; }
       .summary-table th, .summary-table td { 
         border: 1px solid #ddd; 
         padding: 8px; 
         text-align: left; 
       }
       .summary-table th { background-color: #f2f2f2; }
       .success { color: green; }
       .warning { color: orange; }
       .error { color: red; }
     </style>
   </head>
   <body>
     <h2>Reporte de Sincronización - {{sync_date}}</h2>
     
     <h3>Resumen</h3>
     <table class="summary-table">
       <tr>
         <th>Métrica</th>
         <th>Valor</th>
         <th>Estado</th>
       </tr>
       <tr>
         <td>Total Registros Procesados</td>
         <td>{{summary.total_processed}}</td>
         <td class="success">✅</td>
       </tr>
       <tr>
         <td>Registros Creados</td>
         <td>{{summary.created_count}}</td>
         <td class="success">✅</td>
       </tr>
       <tr>
         <td>Registros Actualizados</td>
         <td>{{summary.updated_count}}</td>
         <td class="success">✅</td>
       </tr>
       <tr>
         <td>Registros Eliminados</td>
         <td>{{summary.deleted_count}}</td>
         <td class="warning">⚠️</td>
       </tr>
       <tr>
         <td>Conflictos Encontrados</td>
         <td>{{summary.conflicts_count}}</td>
         <td class="{{conflict_class}}">{{conflict_icon}}</td>
       </tr>
       <tr>
         <td>Tiempo de Ejecución</td>
         <td>{{execution_time}} ms</td>
         <td class="success">✅</td>
       </tr>
     </table>
     
     {{#if conflicts}}
     <h3>Conflictos Detectados</h3>
     <p>Se detectaron {{conflicts.length}} conflictos que requieren revisión manual.</p>
     <ul>
       {{#each conflicts}}
       <li>
         <strong>{{this.Name}}</strong> ({{this.Email}})
         <br>Última modificación SF: {{this.LastModifiedDate}}
         <br>Última modificación Interna: {{this.updated_at}}
       </li>
       {{/each}}
     </ul>
     {{/if}}
     
     <p>Para más detalles, consulte el dashboard de sincronización.</p>
   </body>
   </html>
   ```

### Paso 10: Validar y Probar

1. **Ejecutar workflow manualmente** para probar

2. **Monitorear primera ejecución**:
   - Ver logs en tiempo real
   - Revisar base de datos para confirmar sincronización
   - Verificar emails de reporte

### Resultado del Workflow Intermedio

```
✅ Workflow Creado: "Sincronización de Clientes Salesforce"
⏰ Programación: Diario a las 2:00 AM
🔗 Integración: Salesforce API
📊 Estado: Activo y Monitoreado
⏱️ Tiempo promedio: ~45 segundos
📧 Reportes: Automáticos diarios
🔄 Sync Status: ✅ Bidireccional
🔍 Conflictos: Resolución automática
```

---

## 🤖 Workflow Avanzado: Inteligencia Artificial y Auto-scaling

### Descripción
Crear un workflow inteligente que use ML para predecir demanda, optimice recursos automáticamente y escale infraestructura según la carga predicted.

### Objetivo de Negocio
Implementar un sistema de auto-scaling inteligente que optimice costos y performance basado en predicciones de IA.

### Diagrama del Workflow
```
[Load Monitor] → [ML Predict] → [Optimize Resources] → [Auto-scale] → [Performance Check] → [ML Learn] → [Log Metrics] → [End]
      ↓              ↓              ↓                ↓               ↓              ↓              ↓
  Real-time     Forecasting     AI Decision     Infrastructure   Validation   Model Update    Analytics
  Metrics       Algorithm       Engine          Manager          AI Model     Feedback Loop   & Reporting
```

### Paso 1: Monitoreo en Tiempo Real

1. **Agregar nodo Scheduler (High Frequency)**:
   - Configuración:
   ```
   Schedule: Every 5 minutes
   Type: Recurring
   Timezone: UTC
   Description: "High-frequency load monitoring"
   ```

2. **Agregar nodo HTTP Request (Metrics API)**:
   - Conectar **Scheduler** → **HTTP Request**
   - Configurar:
   ```
   API Endpoint: /api/system/metrics
   Method: GET
   Headers:
     Authorization: Bearer {{MONITORING_TOKEN}}
   
   Metrics Collected:
   - CPU utilization (%)
   - Memory usage (%)
   - Active connections
   - Request rate (req/min)
   - Response time (ms)
   - Error rate (%)
   - Queue depth
   - Database connections
   ```

### Paso 2: Predicción con ML

1. **Agregar nodo AI/ML**:
   - Nombre: "ML Load Prediction"
   - Conectar **HTTP Request** → **AI/ML**

2. **Configurar modelo ML**:
   ```
   Model Type: time-series-forecasting
   Model Name: load-predictor-v2
   Input Features:
     - historical_cpu: [CPU usage last 24h]
     - historical_memory: [Memory usage last 24h]
     - historical_requests: [Request rate last 24h]
     - time_of_day: Current time
     - day_of_week: Current day
     - is_business_hours: Boolean
     - recent_events: Event data
   
   Prediction Horizon: 1 hour ahead
   Confidence Threshold: 0.85
   Update Model: Enabled
   ```

3. **Configurar predicción**:
   ```
   ML Request:
   {
     "model": "load-predictor-v2",
     "input": {
       "current_metrics": {{http_response.data}},
       "historical_window": "24h",
       "prediction_horizon": "60min"
     },
     "config": {
       "confidence_threshold": 0.85,
       "return_explanations": true
     }
   }
   
   Expected Output:
   {
     "predictions": [
       {
         "timestamp": "2025-11-09T09:00:00Z",
         "cpu_predicted": 75.2,
         "memory_predicted": 68.4,
         "requests_predicted": 450,
         "confidence": 0.89,
         "explanation": "High demand expected during business hours"
       }
     ],
     "model_version": "v2.1.3",
     "overall_confidence": 0.87
   }
   ```

### Paso 3: Motor de Optimización

1. **Agregar nodo AI/ML (Optimization Engine)**:
   - Nombre: "Resource Optimization"
   - Conectar **ML Predict** → **Optimization Engine**

2. **Configurar algoritmo de optimización**:
   ```
   Optimization Algorithm: genetic-algorithm
   Objective Functions:
     1. Minimize cost (weight: 0.4)
     2. Maintain performance SLA (weight: 0.4)
     3. Minimize resource waste (weight: 0.2)
   
   Constraints:
     - Max CPU per pod: 80%
     - Max memory per pod: 85%
     - Min pods: 2
     - Max pods: 20
     - Scale up cooldown: 5 minutes
     - Scale down cooldown: 10 minutes
   
   Decision Variables:
     - target_replicas
     - cpu_limit_per_pod
     - memory_limit_per_pod
     - auto_scaling_policy
   
   Cost Model:
     - Cost per pod per hour: $0.05
     - Load balancer cost: $0.02/hour
     - Storage cost: $0.01/GB/hour
   ```

3. **Configurar optimización**:
   ```
   Optimization Request:
   {
     "algorithm": "genetic-algorithm",
     "objective": "multi-objective",
     "constraints": {
       "max_replicas": 20,
       "min_replicas": 2,
       "max_cpu": 80,
       "max_memory": 85,
       "cooldown_up": 300,
       "cooldown_down": 600
     },
     "current_state": {
       "replicas": {{current_replicas}},
       "cpu_utilization": {{ml_prediction.current_cpu}},
       "memory_utilization": {{ml_prediction.current_memory}},
       "cost_per_hour": {{current_cost}}
     },
     "predicted_load": {{ml_prediction.predictions}},
     "business_rules": {
       "peak_hours_scale_aggressive": true,
       "off_peak_aggressive_scaling": false,
       "cost_optimization_priority": "medium"
     }
   }
   ```

### Paso 4: Auto-scaling Inteligente

1. **Agregar nodo Custom (Auto-scaler)**:
   - Nombre: "Intelligent Auto-scaler"
   - Conectar **Optimization Engine** → **Auto-scaler**

2. **Configurar escalado**:
   ```
   Scaling Actions:
   
   Scale Up Decision:
   If prediction.confidence > 0.8 AND
      predicted_cpu > 70% AND
      cooldown_completed AND
      not_scaling_recently
   
   Then:
     - Calculate optimal replicas: {{optimization.target_replicas}}
     - Apply scaling gradually: +2 pods per action
     - Update load balancer configuration
     - Send notifications
   
   Scale Down Decision:
   If prediction.confidence > 0.8 AND
      predicted_cpu < 40% AND
      current_replicas > min_replicas AND
      cooldown_completed
   
   Then:
     - Calculate optimal replicas: {{optimization.target_replicas}}
     - Apply scaling conservatively: -1 pod per action
     - Wait for traffic drain
     - Update monitoring alerts
   
   Safety Measures:
     - Minimum replicas: 2
     - Maximum replicas: 20
     - Cooldown periods: 5-10 minutes
     - Health check validation: Required
     - Rollback on failure: Automatic
   ```

### Paso 5: Validación de Performance

1. **Agregar nodo AI/ML (Performance Validator)**:
   - Nombre: "Performance Validation"
   - Conectar **Auto-scaler** → **Performance Validator**

2. **Configurar validación**:
   ```
   Performance Metrics:
   - Response time (target: < 200ms)
   - Error rate (target: < 0.1%)
   - Throughput (target: maintain or improve)
   - Resource utilization (CPU < 80%, Memory < 85%)
   - Cost per transaction (monitor changes)
   
   Validation Rules:
   Rule 1: response_time < 200ms (95th percentile)
   Rule 2: error_rate < 0.1%
   Rule 3: cpu_utilization < 80%
   Rule 4: memory_utilization < 85%
   Rule 5: cost_efficiency_maintained
   
   Success Criteria: All rules pass
   Warning Criteria: 1-2 rules borderline
   Failure Criteria: 3+ rules fail
   
   Actions:
   - Success: Log success, continue to learning
   - Warning: Log warning, continue to learning
   - Failure: Rollback scaling, alert admin
   ```

### Paso 6: Aprendizaje Continuo

1. **Agregar nodo AI/ML (Model Updater)**:
   - Nombre: "Continuous Learning"
   - Conectar **Performance Validator** → **Model Updater**

2. **Configurar feedback loop**:
   ```
   Learning Data:
   - Predicted values
   - Actual values
   - Performance outcomes
   - Scaling decisions and results
   - Cost impact
   - User experience metrics
   
   Model Update Conditions:
   - Performance deviates > 10% from prediction
   - Model accuracy drops below 0.8
   - New patterns detected
   - Quarterly updates
   
   Learning Algorithm: online-learning
   Batch Size: 1000 samples
   Update Frequency: Every 100 executions
   Model Versioning: Automatic
   A/B Testing: Enabled for model versions
   
   Feedback Collection:
   {
     "prediction_id": "{{prediction.id}}",
     "predicted_values": {{ml_prediction.output}},
     "actual_values": {
       "cpu": {{performance.actual_cpu}},
       "memory": {{performance.actual_memory}},
       "response_time": {{performance.actual_response_time}},
       "cost": {{performance.actual_cost}}
     },
     "scaling_decision": {
       "action": "{{scaling.action}}",
       "replicas_before": {{scaling.replicas_before}},
       "replicas_after": {{scaling.replicas_after}},
       "outcome": "{{scaling.outcome}}"
     },
     "performance_impact": {
       "improved": {{performance.improved}},
       "degraded": {{performance.degraded}},
       "neutral": {{performance.neutral}}
     },
     "user_feedback": {{performance.user_satisfaction}}
   }
   ```

### Paso 7: Logging y Analytics

1. **Agregar nodo Database**:
   - Nombre: "Log AI Decisions"
   - Conectar **Model Updater** → **Database**

2. **Configurar analytics**:
   ```
   Log Tables:
   - ai_decisions_log
   - scaling_actions_log
   - performance_metrics_log
   - model_performance_log
   
   Decision Log Query:
   INSERT INTO ai_decisions_log (
     decision_id, timestamp, workflow_id,
     predicted_load, optimization_result,
     scaling_action, performance_before,
     performance_after, confidence_score,
     cost_impact, learning_feedback
   ) VALUES (
     '{{decision.id}}',
     NOW(),
     '{{workflow.id}}',
     {{JSON.stringify(predicted_load)}},
     {{JSON.stringify(optimization_result)}},
     '{{scaling.action}}',
     {{JSON.stringify(performance_before)}},
     {{JSON.stringify(performance_after)}},
     {{decision.confidence}},
     {{cost_impact}},
     {{JSON.stringify(learning_data)}}
   );
   ```

### Paso 8: Dashboard y Alertas

1. **Agregar nodo HTTP Request (Dashboard Update)**:
   - Nombre: "Update AI Dashboard"
   - Conectar **Database** → **HTTP Request**

2. **Configurar dashboard**:
   ```
   Dashboard API: /api/ai/dashboard/update
   
   Update Data:
   {
     "timestamp": "{{now}}",
     "ai_decisions_today": {{ai_decisions_count}},
     "successful_scalings": {{successful_scalings}},
     "performance_improvements": {{performance_improvements}},
     "cost_savings": {{cost_savings}},
     "model_accuracy": {{model_accuracy}},
     "prediction_confidence": {{avg_confidence}},
     "trends": {
       "scaling_frequency": "{{scaling_trend}}",
       "performance_trend": "{{performance_trend}}",
       "cost_efficiency": "{{cost_efficiency_trend}}"
     }
   }
   ```

### Paso 9: Configurar Alertas Inteligentes

1. **Agregar nodo Email/Slack (Smart Alerts)**:
   - Nombre: "Intelligent Alerting"
   - Conectar **Performance Validator** → **Smart Alerts**

2. **Configurar alertas**:
   ```
   Alert Conditions:
   
   Critical Alerts:
   - Model accuracy < 0.7
   - Performance degradation > 20%
   - Scaling failures
   - Cost spike > 50%
   
   Warning Alerts:
   - Model accuracy < 0.8
   - Predictions inconsistent with reality
   - High prediction confidence but wrong outcomes
   - Unusual scaling patterns
   
   Info Alerts:
   - Daily AI performance summary
   - New model versions deployed
   - Learning milestones reached
   
   Smart Alerting Rules:
   - Use ML to reduce false positives
   - Batch similar alerts
   - Smart timing (don't alert at 3 AM unless critical)
   - Include suggested actions in alerts
   ```

### Paso 10: Validar y Optimizar

1. **Probar el workflow**:
   - Ejecutar en modo test con datos históricos
   - Monitorear predicciones vs realidad
   - Ajustar umbrales y parámetros

2. **Métricas de Éxito**:
   ```
   Performance Metrics:
   - Prediction accuracy: > 85%
   - Cost reduction: > 25%
   - Response time improvement: > 15%
   - Resource utilization optimization: > 20%
   - False positive alerts: < 5%
   
   Business Metrics:
   - Reduced manual intervention: 90%
   - Improved resource efficiency: 25%
   - Better cost predictability: 95%
   - Enhanced user experience: 20% improvement
   ```

### Resultado del Workflow Avanzado

```
✅ Workflow Creado: "AI-Powered Auto-scaling"
🤖 IA/ML: Load prediction + optimization + learning
⚡ Auto-scaling: Inteligente y optimizado por costos
📊 Monitoreo: 5 minutos con predicciones 1 hora
🔄 Aprendizaje: Continuo con feedback loops
💰 Optimización: Costos + Performance + Eficiencia
📈 Dashboard: Tiempo real con insights de IA
🚨 Alertas: Inteligentes con acciones sugeridas
```

---

## 🎯 Mejores Prácticas

### 1. Diseño de Workflows

```
✅ DO:
- Usa nombres descriptivos para nodos
- Agrupa nodos relacionados
- Implementa manejo de errores robusto
- Documenta workflows complejos
- Usa versionado para cambios importantes

❌ DON'T:
- Crear workflows con más de 50 nodos
- Conectar directamente start a end
- Ignorar el manejo de errores
- Usar datos hardcodeados
- Crear dependencias circulares
```

### 2. Performance y Escalabilidad

```
✅ DO:
- Implementa timeouts apropiados
- Usa batch processing para datos grandes
- Implementa rate limiting
- Monitorea memory usage
- Usa conexiones pooling

❌ DON'T:
- Hacer llamadas sincrónicas a APIs lentas
- Cargar grandes datasets en memoria
- Ignorar límites de API
- Crear infinite loops
- Usar timeouts muy altos
```

### 3. Seguridad

```
✅ DO:
- Valida todos los inputs
- Usa conexiones seguras (HTTPS/TLS)
- Implementa autenticación robusta
- Encripta datos sensibles
- Mantén logs de auditoría

❌ DON'T:
- Exponer credenciales en logs
- Usar conexiones sin encriptar
- Ignorar validación de datos
- Compartir tokens de API
- Almacenar passwords en plain text
```

### 4. Monitoreo y Debugging

```
✅ DO:
- Implementa logging detallado
- Usa métricas de negocio
- Configura alertas apropiadas
- Mantén historiales de ejecución
- Usa el debug mode durante desarrollo

❌ DON'T:
- Ignorar warnings del sistema
- No monitorear métricas clave
- Usar logs de solo error
- Ignorar patrones de uso
- Desactivar alertas críticas
```

---

## 🏆 Conclusión

Has completado la creación de tres workflows de diferentes niveles de complejidad:

1. **Básico**: Procesamiento de formularios con validación y notificaciones
2. **Intermedio**: Sincronización de datos con manejo de conflictos
3. **Avanzado**: Sistema de auto-scaling inteligente con IA/ML

### Próximos Pasos

- **Explorar Conectores**: Implementa workflows con bases de datos, APIs empresariales
- **Funciones de IA**: Experimenta con optimización de workflows y recomendaciones
- **Workflows Complejos**: Crea workflows con cientos de nodos y lógica avanzada
- **Integración**: Conecta con sistemas empresariales existentes
- **Optimización**: Usa analytics para mejorar performance de workflows

### Recursos Adicionales

- 📖 [Documentación Completa de la API](api-reference.md)
- 🔧 [Guía de Administración](admin-guide.md)
- 🤖 [Funciones de IA/ML](ai-guide.md)
- 💬 [Comunidad y Soporte](community.md)

**¡Felicidades! Ya tienes las bases para crear workflows complejos y poderosos en Silhouette Workflow Platform! 🎉**
