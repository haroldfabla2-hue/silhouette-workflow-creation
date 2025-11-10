# 🚀 Quick Start Guide - Silhouette Workflow Platform

## ⏱️ 5-Minute Start: Tu Primera Automatización

¡Bienvenido a Silhouette Workflow Platform! En los próximos 5 minutos tendrás tu primer workflow funcionando. ¡Vamos a empezar!

---

## 🎯 ¿Qué vas a conseguir?

Al final de esta guía tendrás:
- ✅ Un workflow completamente funcional
- ✅ Un webhook funcionando que recibe datos
- ✅ Un email automático de confirmación
- ✅ Datos guardados en base de datos

---

## 📋 Paso 1: Acceder a la Plataforma (30 segundos)

1. **Abre tu navegador** y ve a: `https://tu-dominio.silhouette.com`
2. **Inicia sesión** con las credenciales que recibiste
3. **Verás el Dashboard** - tu centro de control principal

**💡 Tip:** Si es tu primera vez, verás automáticamente un tour de bienvenida que puedes seguir o saltar.

---

## 🛠️ Paso 2: Crear Tu Primer Workflow (1 minuto)

1. **Haz clic en "Crear Workflow"** (botón azul en la esquina superior derecha)
2. **Selecciona "Workflow Vacío"** (empezamos desde cero)
3. **Nombre:** "Mi Primera Automatización"
4. **Descripción:** "Automático que valida formularios y envía confirmaciones"
5. **Haz clic en "Crear"**

**✅ Resultado:** Se abre el Editor de Workflows

---

## 🎨 Paso 3: Conocer el Editor (1 minuto)

El Editor tiene 3 secciones principales:

### 📁 Panel Izquierdo: Librería de Nodos
- **Conectores**: APIs, bases de datos, servicios
- **General**: Start, End, Error
- **Control**: If, Loop, Delay
- **Datos**: Transform, Filter, Validation

### 🎨 Área Central: Canvas de Trabajo
- Aquí arrastras y conectas los nodos
- El área de trabajo se ajusta automáticamente

### ⚙️ Panel Derecho: Configuración
- Se actualiza según el nodo seleccionado
- Aquí configuras las propiedades de cada nodo

**💡 Tip:** Puedes hacer zoom con Ctrl + scroll, y mover el canvas con click y arrastre.

---

## 🔄 Paso 4: Agregar el Nodo de Inicio (30 segundos)

1. **Busca el nodo "Start"** en la sección "General" del panel izquierdo
2. **Arrastra "Start"** al canvas (aparece automáticamente en la izquierda)
3. **Selecciona el nodo** (haz clic en él)
4. **En el panel derecho cambia**:
   - **Nombre**: "Inicio del Proceso"
   - **Descripción**: "Punto de entrada para el workflow"

**✅ Resultado:** Tu primer nodo está listo

---

## 🌐 Paso 5: Agregar Webhook (1 minuto)

1. **Busca el nodo "Webhook"** en "Conectores"
2. **Arrastra al canvas** y suéltalo a la derecha del nodo Start
3. **Conecta los nodos**: 
   - Haz clic en el punto pequeño del nodo Start
   - Arrastra hasta el nodo Webhook
   - Verás una línea que los conecta

4. **Configura el Webhook** (panel derecho):
   - **Nombre**: "Recibir Datos"
   - **Método**: POST
   - **Path**: /mi-formulario
   - **Descripción**: "Recibe datos del formulario web"

**💡 El webhook URL estará disponible una vez que publiques el workflow**

---

## ✅ Paso 6: Agregar Validación (1 minuto)

1. **Busca "Filter"** en la sección "Datos"
2. **Arrastra al canvas** y colócalo después del Webhook
3. **Conecta Webhook → Filter**
4. **Configura el Filter**:
   - **Nombre**: "Validar Datos"
   - **Condición**: email debe ser un email válido
   - **Acción si válido**: Continuar al siguiente nodo
   - **Acción si inválido**: Enviar a nodo de error

**💡 Esto asegura que solo procesemos datos válidos**

---

## 📧 Paso 7: Agregar Envío de Email (1 minuto)

1. **Busca "Email"** en "Conectores"
2. **Arrastra al canvas** después del Filter
3. **Conecta Filter → Email**
4. **Configura el Email**:
   - **Nombre**: "Enviar Confirmación"
   - **Para**: {{webhook_data.email}}
   - **Asunto**: "¡Gracias por contactarnos!"
   - **Mensaje**: 
     ```
     Hola {{webhook_data.nombre}},
     
     Hemos recibido tu mensaje: "{{webhook_data.mensaje}}"
     
     Te contactaremos pronto.
     
     Saludos,
     El equipo de Silhouette
     ```

**💡 Los {{}} permiten usar datos dinámicos del paso anterior**

---

## 💾 Paso 8: Agregar Base de Datos (30 segundos)

1. **Busca "Database"** en "Conectores"
2. **Arrastra al canvas** después del Email
3. **Conecta Email → Database**
4. **Configura Database**:
   - **Nombre**: "Guardar en BD"
   - **Tipo**: PostgreSQL
   - **Tabla**: formulario_contacto
   - **Consulta**: 
     ```sql
     INSERT INTO formulario_contacto (nombre, email, mensaje, fecha)
     VALUES ('{{webhook_data.nombre}}', '{{webhook_data.email}}', '{{webhook_data.mensaje}}', NOW())
     ```

---

## 🚨 Paso 9: Agregar Manejo de Errores (30 segundos)

1. **Busca "Error"** en "General"
2. **Arrastra al canvas** en la parte inferior
3. **Conecta todos los nodos que pueden fallar** con el nodo Error:
   - Webhook → Error
   - Filter → Error  
   - Email → Error
   - Database → Error

4. **Configura Error**:
   - **Nombre**: "Manejo de Errores"
   - **Acción**: Enviar email de notificación
   - **Email**: admin@tu-empresa.com
   - **Asunto**: "Error en workflow: Mi Primera Automatización"

---

## ✅ Paso 10: Validar y Probar (1 minuto)

1. **Haz clic en "Validar"** (botón en la barra superior)
   - ✅ Si todo está bien: aparecerá un check verde
   - ❌ Si hay errores: aparecerán en la parte inferior

2. **Si no hay errores**, haz clic en "Guardar"

3. **Para probar el workflow**:
   - Haz clic en "Ejecutar"
   - Selecciona "Ejecución de Prueba"
   - Verás el webhook URL generado

---

## 🎉 ¡Felicitaciones! Tu Workflow Está Listo

### 📋 Lo que acabas de crear:

```
🔄 Flujo del Workflow:
Start → Webhook → Filter → Email → Database
          ↓
       [Error Handler]
```

### 🔗 Tu Webhook URL:
`https://tu-dominio.silhouette.com/webhook/mi-formulario`

### 🧪 Para Probar:
```bash
curl -X POST https://tu-dominio.silhouette.com/webhook/mi-formulario \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@empresa.com",
    "mensaje": "Hola, me gustaría más información sobre sus servicios"
  }'
```

---

## 📊 Monitorea tu Workflow

1. **Ve a "Ejecuciones"** en el menú lateral
2. **Verás la ejecución** de tu prueba
3. **Analiza los logs** para ver qué pasó en cada nodo
4. **Revisa el email** en tu bandeja de entrada

---

## 🚀 Próximos Pasos

### Para Seguir Aprendiendo:
1. **Ve a "Tutoriales"** → "Crear tu Segundo Workflow"
2. **Explora los Templates** en "Crear Workflow"
3. **Lee la "Guía de Conectores"** para más integraciones
4. **Únete a la "Comunidad"** para tips y mejores prácticas

### Para Hacer tu Workflow Más Poderoso:
- **Agregar más validaciones**
- **Conectar con más servicios** (Salesforce, Slack, etc.)
- **Implementar lógica condicional**
- **Programar ejecuciones automáticas**

### Para Monitorear y Optimizar:
- **Configurar alertas**
- **Ver analytics de performance**
- **Optimizar con IA**
- **Escalar recursos automáticamente**

---

## 🆘 ¿Necesitas Ayuda?

### Recursos Disponibles:
- **📖 Documentación Completa**: `/docs/user-guide/`
- **🎥 Videos Tutoriales**: `/videos/`
- **💬 Chat de Soporte**: Botón en la esquina inferior derecha
- **📧 Email**: support@silhouette.com
- **📞 Teléfono**: +1-800-SILHOUETTE (solo para clientes premium)

### Comandos Rápidos:
- **Ctrl + S**: Guardar workflow
- **Ctrl + Z**: Deshacer
- **Ctrl + Y**: Rehacer
- **Ctrl + 0**: Ajustar zoom
- **F1**: Ayuda contextual

---

## 🎯 Resumen de Logros

¡En solo 5 minutos has logrado:

✅ **Configurar un workflow completo**
✅ **Recibir datos vía webhook**  
✅ **Validar información automáticamente**
✅ **Enviar emails personalizados**
✅ **Guardar datos en base de datos**
✅ **Manejar errores apropiadamente**
✅ **Entender el editor visual**

**¡Bienvenido al futuro de la automatización! 🚀**

---

### 💬 Déjanos tu Feedback

¿Esta guía te ayudó? ¿Algo fue confuso? ¿Tienes sugerencias?
- **Thumb Up/Down**: En la parte superior de esta guía
- **Comentarios**: Escribe tu experiencia
- **Sugerencias**: Ayúdanos a mejorar

**¡Tu feedback hace que Silhouette sea mejor para todos! 🙌**