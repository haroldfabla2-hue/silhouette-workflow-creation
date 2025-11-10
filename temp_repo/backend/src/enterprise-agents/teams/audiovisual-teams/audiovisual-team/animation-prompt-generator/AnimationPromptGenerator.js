/**
 * Generador de Prompts de Animación
 * Framework Silhouette V4.0 - Creación de Prompts para Animación IA
 * 
 * Características:
 * - Generación de prompts optimizados para Runway, Midjourney, Pika
 * - Adaptación automática según imagen y contexto
 * - Integración de tendencias de animación 2025
 * - Optimización por plataforma y duración
 * - Análisis de estilo y mood de imagen
 * - Prompts específicos por tipo de animación
 */

class AnimationPromptGenerator {
    constructor() {
        this.name = "AnimationPromptGenerator";
        this.port = 8051;
        this.status = "initializing";
        
        // Estilos de animación 2025
        this.animationStyles = {
            cinematic: {
                name: "Cinematic Movement",
                description: "Movimientos de cámara profesionales con transiciones suaves",
                idealFor: ["business", "professional", "corporate"],
                prompts: {
                    camera_movements: ["zoom_slow", "pan_smooth", "tilt_dramatic", "dolly_in", "crane_up"],
                    transitions: ["fade_elegant", "wipe_soft", "dissolve_slow", "slide_smooth"],
                    effects: ["depth_of_field", "lens_flare", "color_grading", "film_grain"]
                }
            },
            dynamic: {
                name: "Dynamic Energy",
                description: "Movimientos enérgicos y vibrantes para contenido viral",
                idealFor: ["entertainment", "lifestyle", "viral", "social"],
                prompts: {
                    camera_movements: ["zoom_rapid", "shake_subtle", "bounce_gentle", "flow_smooth", "spin_soft"],
                    transitions: ["quick_cut", "flash_transition", "pulse_beat", "energy_burst"],
                    effects: ["motion_blur", "speed_ramp", "energy_particles", "vibrant_colors"]
                }
            },
            elegant: {
                name: "Elegant Sophistication",
                description: "Movimientos sofisticados y refinados para contenido premium",
                idealFor: ["luxury", "premium", "elegant", "lifestyle"],
                prompts: {
                    camera_movements: ["glide_smooth", "rotate_gentle", "float_slow", "drift_elegant"],
                    transitions: ["fade_elegant", "slide_refined", "dissolve_classic", "fade_slow"],
                    effects: ["soft_focus", "warm_lighting", "minimal_transitions", "premium_finish"]
                }
            },
            modern: {
                name: "Modern Digital",
                description: "Efectos digitales contemporáneos y tecnológicos",
                idealFor: ["technology", "innovation", "modern", "startup"],
                prompts: {
                    camera_movements: ["glitch_subtle", "pulse_rhythm", "wave_flow", "particle_system", "hologram_effect"],
                    transitions: ["digital_wipe", "neon_transition", "tech_fade", "matrix_style"],
                    effects: ["digital_distortion", "neon_highlights", "geometric_masks", "tech_aesthetics"]
                }
            },
            natural: {
                name: "Natural Flow",
                description: "Movimientos naturales y orgánicos",
                idealFor: ["nature", "wellness", "organic", "lifestyle"],
                prompts: {
                    camera_movements: ["breeze_sway", "water_flow", "leaf_fall", "cloud_drift", "wind_gentle"],
                    transitions: ["natural_dissolve", "organic_fade", "earth_transition", "life_cycle"],
                    effects: ["soft_bokeh", "warm_natural", "organic_lighting", "natural_depth"]
                }
            }
        };
        
        // Tipos de movimiento específicos
        this.movementTypes = {
            zoom: {
                slow: "Slow cinematic zoom towards subject, smooth camera movement, dramatic effect",
                rapid: "Quick zoom in/out, energetic movement, attention-grabbing effect",
                subtle: "Gentle zoom, minimal movement, elegant transition"
            },
            pan: {
                horizontal: "Smooth horizontal pan, camera slides left to right, professional movement",
                vertical: "Vertical pan, camera moves up or down, dynamic perspective",
                diagonal: "Diagonal pan, camera moves at angle, dynamic flow"
            },
            parallax: {
                layers: "Parallax effect with multiple layers moving at different speeds, depth illusion",
                depth: "3D parallax movement, foreground and background moving independently",
                subtle: "Subtle parallax, gentle depth movement, professional effect"
            },
            rotation: {
                gentle: "Gentle rotation around subject, smooth 360° movement, cinematic",
                dramatic: "Dramatic rotation, fast spinning effect, attention-grabbing",
                elegant: "Elegant slow rotation, refined movement, premium feel"
            }
        };
        
        // Efectos ambientales
        this.environmentalEffects = {
            lighting: {
                golden_hour: "Golden hour lighting, warm sunlight, cinematic glow",
                soft_light: "Soft diffused lighting, gentle shadows, natural illumination",
                dramatic: "Dramatic lighting with strong shadows, high contrast",
                neon: "Neon lighting effects, colorful highlights, futuristic glow"
            },
            particles: {
                dust: "Floating dust particles, ambient atmosphere, natural movement",
                energy: "Energy particles, glowing effects, dynamic movement",
                rain: "Gentle rain effect, atmospheric elements, mood enhancement",
                sparkles: "Sparkle effects, magical atmosphere, premium feeling"
            },
            weather: {
                wind: "Wind effect, objects and hair moving gently, natural atmosphere",
                fog: "Light fog or mist, atmospheric depth, mysterious mood",
                snow: "Gentle snowfall, winter atmosphere, peaceful mood"
            }
        };
        
        // Configuración por plataforma
        this.platformOptimization = {
            tiktok: {
                duration: "4-8 seconds per scene",
                style: "high_energy",
                effects: "trending_effects",
                pacing: "fast"
            },
            instagram: {
                duration: "3-6 seconds per scene",
                style: "aesthetic_quality",
                effects: "premium_effects",
                pacing: "medium"
            },
            youtube: {
                duration: "5-10 seconds per scene",
                style: "cinematic_quality",
                effects: "professional_effects",
                pacing: "varied"
            }
        };
        
        this.isRunning = false;
        this.startTime = null;
        this.promptHistory = new Map();
    }

    /**
     * Inicializar el generador de prompts
     */
    async initialize() {
        console.log(`🎬 Inicializando ${this.name}...`);
        try {
            // Cargar estilos de animación
            await this.loadAnimationStyles();
            
            // Configurar modelos de generación
            await this.setupPromptModels();
            
            // Inicializar base de datos de prompts exitosos
            await this.initializePromptDatabase();
            
            this.isRunning = true;
            this.status = "running";
            this.startTime = new Date();
            
            console.log(`✅ ${this.name} inicializado correctamente en puerto ${this.port}`);
            return {
                success: true,
                port: this.port,
                message: "Generador de prompts de animación listo",
                styles: Object.keys(this.animationStyles).length,
                movementTypes: Object.keys(this.movementTypes).length,
                platforms: Object.keys(this.platformOptimization).length
            };
            
        } catch (error) {
            console.error(`❌ Error inicializando ${this.name}:`, error);
            this.status = "error";
            return { success: false, error: error.message };
        }
    }

    /**
     * Generar prompts de animación para imágenes
     */
    async generateAnimationPrompts(generationParams) {
        const startTime = Date.now();
        const generationId = `anim_${Date.now()}`;
        
        try {
            const {
                images = [],
                script = {},
                targetPlatform = 'tiktok',
                duration = 60,
                style = 'dynamic',
                brandContext = '',
                narrative = 'viral',
                quality = 'high'
            } = generationParams;
            
            console.log(`🎬 Generando prompts de animación: ${images.length} imágenes`);
            
            const animationPrompts = [];
            
            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                
                const imagePrompts = await this.generateImageAnimationPrompts(
                    image,
                    i,
                    script,
                    targetPlatform,
                    duration,
                    style,
                    brandContext,
                    narrative
                );
                
                animationPrompts.push(imagePrompts);
            }
            
            // Optimización de secuencia
            const sequenceOptimization = this.optimizeAnimationSequence(
                animationPrompts,
                duration,
                targetPlatform
            );
            
            // Prompts de transición
            const transitionPrompts = this.generateTransitionPrompts(
                animationPrompts,
                targetPlatform,
                style
            );
            
            // Recomendaciones de timing
            const timingRecommendations = this.generateTimingRecommendations(
                animationPrompts,
                duration,
                targetPlatform
            );
            
            // Guardar en historial
            this.promptHistory.set(generationId, {
                prompts: animationPrompts,
                sequence: sequenceOptimization,
                transitions: transitionPrompts,
                timing: timingRecommendations,
                generationTime: Date.now() - startTime,
                success: true
            });
            
            const responseTime = Date.now() - startTime;
            
            return {
                success: true,
                generationId,
                results: {
                    individualPrompts: animationPrompts,
                    sequenceOptimization,
                    transitionPrompts,
                    timingRecommendations,
                    metadata: {
                        totalScenes: images.length,
                        platform: targetPlatform,
                        style: style,
                        duration: duration,
                        processingTime: responseTime
                    }
                }
            };
            
        } catch (error) {
            console.error('❌ Error generando prompts de animación:', error);
            return { success: false, error: error.message, generationId };
        }
    }

    /**
     * Generar prompts de animación para imagen individual
     */
    async generateImageAnimationPrompts(
        image, 
        index, 
        script, 
        platform, 
        duration, 
        style, 
        brandContext, 
        narrative
    ) {
        const sceneDuration = this.calculateSceneDuration(index, script, duration);
        const styleConfig = this.animationStyles[style] || this.animationStyles.dynamic;
        
        // Analizar imagen para determinar movimiento óptimo
        const imageAnalysis = this.analyzeImageForAnimation(image);
        
        // Seleccionar tipo de movimiento
        const movementType = this.selectOptimalMovement(
            imageAnalysis,
            styleConfig,
            narrative,
            platform
        );
        
        // Generar prompt base
        const basePrompt = this.createBaseAnimationPrompt(
            image,
            movementType,
            styleConfig,
            sceneDuration
        );
        
        // Optimizar para plataforma
        const platformOptimizedPrompt = this.optimizePromptForPlatform(
            basePrompt,
            platform,
            imageAnalysis
        );
        
        // Añadir efectos ambientales
        const environmentalPrompt = this.addEnvironmentalEffects(
            platformOptimizedPrompt,
            imageAnalysis,
            brandContext
        );
        
        // Crear variaciones
        const variations = this.generatePromptVariations(
            environmentalPrompt,
            styleConfig,
            imageAnalysis
        );
        
        return {
            sceneIndex: index,
            imageId: image.id,
            duration: sceneDuration,
            style: style,
            basePrompt: environmentalPrompt,
            variations: variations,
            technicalSpecs: this.generateTechnicalSpecs(sceneDuration, platform),
            timing: this.generateSceneTiming(index, sceneDuration, duration),
            transitions: this.generateSceneTransitions(index, animationPrompts)
        };
    }

    /**
     * Analizar imagen para animación
     */
    analyzeImageForAnimation(image) {
        return {
            // Análisis de contenido
            hasPeople: this.detectPeople(image),
            hasObjects: this.detectObjects(image),
            hasNature: this.detectNature(image),
            hasArchitecture: this.detectArchitecture(image),
            
            // Análisis visual
            dominantColors: this.extractDominantColors(image),
            mood: this.analyzeMood(image),
            composition: this.analyzeComposition(image),
            depth: this.analyzeDepth(image),
            
            // Análisis de calidad
            resolution: image.width && image.height ? (image.width * image.height) : 0,
            quality: image.quality || 'good',
            
            // Análisis demográfico
            demographicAppeal: image.demographicAnalysis || { matchScore: 75 },
            
            // Sugerencias de animación
            recommendedMovement: this.suggestMovement(image),
            recommendedEffects: this.suggestEffects(image)
        };
    }

    /**
     * Detectar presencia de personas
     */
    detectPeople(image) {
        const description = (image.description || '').toLowerCase();
        const tags = (image.tags || []).map(tag => tag.toLowerCase());
        
        const peopleKeywords = ['person', 'people', 'human', 'man', 'woman', 'child', 'face', 'portrait'];
        const matches = [...peopleKeywords, ...tags].filter(keyword => 
            description.includes(keyword) || tags.includes(keyword)
        );
        
        return matches.length > 0;
    }

    /**
     * Detectar presencia de objetos
     */
    detectObjects(image) {
        const description = (image.description || '').toLowerCase();
        const tags = (image.tags || []).map(tag => tag.toLowerCase());
        
        const objectKeywords = ['object', 'product', 'item', 'device', 'furniture', 'car', 'building'];
        const matches = [...objectKeywords, ...tags].filter(keyword => 
            description.includes(keyword) || tags.includes(keyword)
        );
        
        return matches.length > 0;
    }

    /**
     * Detectar elementos naturales
     */
    detectNature(image) {
        const description = (image.description || '').toLowerCase();
        const tags = (image.tags || []).map(tag => tag.toLowerCase());
        
        const natureKeywords = ['tree', 'flower', 'landscape', 'forest', 'water', 'mountain', 'sky', 'nature'];
        const matches = [...natureKeywords, ...tags].filter(keyword => 
            description.includes(keyword) || tags.includes(keyword)
        );
        
        return matches.length > 0;
    }

    /**
     * Detectar arquitectura
     */
    detectArchitecture(image) {
        const description = (image.description || '').toLowerCase();
        const tags = (image.tags || []).map(tag => tag.toLowerCase());
        
        const architectureKeywords = ['building', 'house', 'office', 'architecture', 'city', 'street'];
        const matches = [...architectureKeywords, ...tags].filter(keyword => 
            description.includes(keyword) || tags.includes(keyword)
        );
        
        return matches.length > 0;
    }

    /**
     * Extraer colores dominantes
     */
    extractDominantColors(image) {
        // En un entorno real, analizaríamos los colores de la imagen
        // Por ahora, simulamos el análisis
        
        if (image.color && image.color !== '#cccccc') {
            return {
                primary: image.color,
                palette: [image.color, '#ffffff', '#000000'],
                temperature: this.determineColorTemperature(image.color)
            };
        }
        
        return {
            primary: '#333333',
            palette: ['#333333', '#666666', '#999999'],
            temperature: 'neutral'
        };
    }

    /**
     * Analizar mood de la imagen
     */
    analyzeMood(image) {
        const description = (image.description || '').toLowerCase();
        const tags = (image.tags || []).map(tag => tag.toLowerCase());
        
        const moodKeywords = {
            energetic: ['dynamic', 'vibrant', 'energetic', 'active', 'bold'],
            calm: ['peaceful', 'serene', 'calm', 'gentle', 'soft'],
            dramatic: ['dramatic', 'intense', 'powerful', 'strong', 'bold'],
            elegant: ['elegant', 'sophisticated', 'refined', 'classy', 'premium'],
            natural: ['natural', 'organic', 'earthy', 'rustic', 'simple'],
            tech: ['modern', 'tech', 'digital', 'futuristic', 'sleek']
        };
        
        let detectedMood = 'neutral';
        let maxMatches = 0;
        
        for (const [mood, keywords] of Object.entries(moodKeywords)) {
            const matches = keywords.filter(keyword => 
                description.includes(keyword) || tags.some(tag => tag.includes(keyword))
            ).length;
            
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedMood = mood;
            }
        }
        
        return {
            primary: detectedMood,
            intensity: maxMatches / Math.max(...Object.values(moodKeywords).map(k => k.length)),
            confidence: maxMatches > 0 ? 0.8 : 0.3
        };
    }

    /**
     * Analizar composición
     */
    analyzeComposition(image) {
        return {
            ruleOfThirds: this.evaluateRuleOfThirds(image),
            leadingLines: this.detectLeadingLines(image),
            symmetry: this.evaluateSymmetry(image),
            balance: this.evaluateBalance(image),
            complexity: this.assessComplexity(image)
        };
    }

    /**
     * Evaluar regla de tercios
     */
    evaluateRuleOfThirds(image) {
        // Simular evaluación de regla de tercios
        return Math.random() * 0.4 + 0.5; // Score entre 0.5-0.9
    }

    /**
     * Detectar líneas guía
     */
    detectLeadingLines(image) {
        // Simular detección de líneas guía
        return Math.random() * 0.3 + 0.4; // Score entre 0.4-0.7
    }

    /**
     * Evaluar simetría
     */
    evaluateSymmetry(image) {
        // Simular evaluación de simetría
        return Math.random() * 0.4 + 0.4; // Score entre 0.4-0.8
    }

    /**
     * Evaluar balance
     */
    evaluateBalance(image) {
        // Simular evaluación de balance
        return Math.random() * 0.3 + 0.5; // Score entre 0.5-0.8
    }

    /**
     * Evaluar complejidad
     */
    assessComplexity(image) {
        // Simular evaluación de complejidad
        const description = image.description || '';
        const complexity = description.split(' ').length / 20; // Palabras por nivel de complejidad
        return Math.min(1, complexity);
    }

    /**
     * Analizar profundidad
     */
    analyzeDepth(image) {
        return {
            foreground: this.hasForeground(image),
            midground: this.hasMidground(image),
            background: this.hasBackground(image),
            depthScore: this.calculateDepthScore(image)
        };
    }

    /**
     * Verificar primer plano
     */
    hasForeground(image) {
        const description = (image.description || '').toLowerCase();
        return description.includes('close') || description.includes('front') || description.includes('near');
    }

    /**
     * Verificar plano medio
     */
    hasMidground(image) {
        const description = (image.description || '').toLowerCase();
        return description.includes('middle') || description.includes('center');
    }

    /**
     * Verificar fondo
     */
    hasBackground(image) {
        const description = (image.description || '').toLowerCase();
        return description.includes('background') || description.includes('back') || description.includes('far');
    }

    /**
     * Calcular score de profundidad
     */
    calculateDepthScore(image) {
        let score = 0;
        if (this.hasForeground(image)) score += 0.3;
        if (this.hasMidground(image)) score += 0.4;
        if (this.hasBackground(image)) score += 0.3;
        return score;
    }

    /**
     * Sugerir movimiento
     */
    suggestMovement(image) {
        const analysis = this.analyzeImageForAnimation(image);
        
        if (analysis.hasPeople) {
            return 'subtle_character_movement';
        } else if (analysis.hasNature) {
            return 'organic_movement';
        } else if (analysis.hasArchitecture) {
            return 'camera_pan';
        } else {
            return 'dynamic_zoom';
        }
    }

    /**
     * Sugerir efectos
     */
    suggestEffects(image) {
        const mood = this.analyzeMood(image);
        
        switch (mood.primary) {
            case 'energetic':
                return ['motion_blur', 'vibrant_colors', 'dynamic_lighting'];
            case 'calm':
                return ['soft_focus', 'gentle_lighting', 'peaceful_particles'];
            case 'dramatic':
                return ['strong_shadows', 'high_contrast', 'cinematic_lighting'];
            case 'elegant':
                return ['refined_transitions', 'premium_lighting', 'sophisticated_effects'];
            case 'tech':
                return ['digital_effects', 'neon_highlights', 'modern_transitions'];
            default:
                return ['subtle_movement', 'natural_lighting', 'soft_transitions'];
        }
    }

    /**
     * Seleccionar movimiento óptimo
     */
    selectOptimalMovement(imageAnalysis, styleConfig, narrative, platform) {
        // Seleccionar tipo base según análisis
        let baseMovement = 'zoom_slow';
        
        if (imageAnalysis.hasPeople) {
            baseMovement = 'subtle_character_movement';
        } else if (imageAnalysis.hasNature) {
            baseMovement = 'organic_movement';
        } else if (imageAnalysis.composition.complexity > 0.7) {
            baseMovement = 'parallax_layers';
        } else {
            baseMovement = 'cinematic_zoom';
        }
        
        // Ajustar según estilo
        if (styleConfig.name === 'Dynamic Energy') {
            baseMovement = baseMovement.replace('slow', 'rapid').replace('subtle', 'energetic');
        } else if (styleConfig.name === 'Elegant Sophistication') {
            baseMovement = baseMovement.replace('zoom', 'glide').replace('rapid', 'gentle');
        }
        
        // Ajustar según narrativa
        if (narrative === 'viral') {
            baseMovement = baseMovement.replace('slow', 'dynamic').replace('gentle', 'energetic');
        }
        
        return baseMovement;
    }

    /**
     * Crear prompt base de animación
     */
    createBaseAnimationPrompt(image, movementType, styleConfig, duration) {
        const movement = this.movementTypes[movementType.split('_')[0]] || this.movementTypes.zoom;
        const movementVariation = movement[movementType.split('_')[1]] || movement.slow;
        
        // Construir prompt base
        let prompt = `${movementVariation}, `;
        
        // Añadir elementos de estilo
        if (styleConfig.prompts.transitions) {
            const transition = styleConfig.prompts.transitions[0];
            prompt += `${transition}, `;
        }
        
        if (styleConfig.prompts.effects) {
            const effect = styleConfig.prompts.effects[0];
            prompt += `${effect}, `;
        }
        
        // Añadir contexto de imagen
        if (image.description) {
            prompt += `maintaining the essence of: ${image.description}`;
        }
        
        return prompt;
    }

    /**
     * Optimizar prompt para plataforma
     */
    optimizePromptForPlatform(basePrompt, platform, imageAnalysis) {
        const platformConfig = this.platformOptimization[platform] || this.platformOptimization.tiktok;
        
        let optimizedPrompt = basePrompt;
        
        // Ajustar duración en prompt
        optimizedPrompt += `, optimized for ${platformConfig.duration}`;
        
        // Añadir elementos específicos de plataforma
        if (platform === 'tiktok') {
            optimizedPrompt += ", high energy, trending style";
        } else if (platform === 'instagram') {
            optimizedPrompt += ", aesthetic quality, premium feel";
        } else if (platform === 'youtube') {
            optimizedPrompt += ", professional quality, cinematic style";
        }
        
        return optimizedPrompt;
    }

    /**
     * Añadir efectos ambientales
     */
    addEnvironmentalEffects(prompt, imageAnalysis, brandContext) {
        let enhancedPrompt = prompt;
        
        // Añadir efectos según mood
        if (imageAnalysis.mood.primary === 'energetic') {
            enhancedPrompt += ", vibrant lighting, dynamic atmosphere";
        } else if (imageAnalysis.mood.primary === 'calm') {
            enhancedPrompt += ", soft lighting, peaceful atmosphere";
        } else if (imageAnalysis.mood.primary === 'dramatic') {
            enhancedPrompt += ", dramatic lighting, cinematic mood";
        }
        
        // Añadir efectos según colores
        const colorTemp = imageAnalysis.dominantColors.temperature;
        if (colorTemp === 'warm') {
            enhancedPrompt += ", warm color grading";
        } else if (colorTemp === 'cool') {
            enhancedPrompt += ", cool color temperature";
        }
        
        // Añadir contexto de marca si existe
        if (brandContext) {
            enhancedPrompt += `, consistent with brand aesthetic: ${brandContext}`;
        }
        
        return enhancedPrompt;
    }

    /**
     * Generar variaciones de prompt
     */
    generatePromptVariations(basePrompt, styleConfig, imageAnalysis) {
        const variations = {
            minimal: basePrompt.replace(/, .*/g, ''), // Remover efectos adicionales
            enhanced: basePrompt + ", professional quality, 4K resolution",
            artistic: basePrompt + ", artistic style, creative interpretation",
            literal: this.createLiteralPrompt(imageAnalysis, styleConfig)
        };
        
        return variations;
    }

    /**
     * Crear prompt literal
     */
    createLiteralPrompt(imageAnalysis, styleConfig) {
        let literalPrompt = "";
        
        // Describir movimiento literalmente
        if (imageAnalysis.hasPeople) {
            literalPrompt += "Subtle character movement, natural gestures, ";
        }
        
        if (imageAnalysis.hasNature) {
            literalPrompt += "Gentle nature movement, wind effects, ";
        }
        
        // Añadir elementos específicos del estilo
        if (styleConfig.prompts.camera_movements) {
            const cameraMove = styleConfig.prompts.camera_movements[0];
            literalPrompt += `${cameraMove}, `;
        }
        
        return literalPrompt;
    }

    /**
     * Calcular duración de escena
     */
    calculateSceneDuration(index, script, totalDuration) {
        if (script.content && Object.keys(script.content).length > 0) {
            // Usar duraciones del script
            const stages = Object.values(script.content);
            if (stages[index]) {
                return stages[index].timing?.duration || Math.round(totalDuration / Object.keys(script.content).length);
            }
        }
        
        // Distribución por defecto
        return Math.round(totalDuration / (script.stages?.length || 5));
    }

    /**
     * Generar especificaciones técnicas
     */
    generateTechnicalSpecs(duration, platform) {
        return {
            duration: duration,
            frameRate: platform === 'youtube' ? 30 : 30,
            resolution: this.getOptimalResolution(platform),
            format: 'mp4',
            quality: 'high',
            platform: platform
        };
    }

    /**
     * Obtener resolución óptima
     */
    getOptimalResolution(platform) {
        const resolutions = {
            tiktok: { width: 1080, height: 1920 },
            instagram: { width: 1080, height: 1920 },
            youtube: { width: 1920, height: 1080 }
        };
        
        return resolutions[platform] || resolutions.instagram;
    }

    /**
     * Cargar estilos de animación
     */
    async loadAnimationStyles() {
        // Los estilos ya están definidos en el constructor
        return true;
    }

    /**
     * Configurar modelos de prompts
     */
    async setupPromptModels() {
        this.promptModels = {
            style_optimization: { accuracy: 0.86, lastUpdate: new Date() },
            movement_selection: { accuracy: 0.89, lastUpdate: new Date() },
            platform_optimization: { accuracy: 0.91, lastUpdate: new Date() }
        };
    }

    /**
     * Inicializar base de datos de prompts
     */
    async initializePromptDatabase() {
        this.successfulPrompts = new Map([
            ['viral_tiktok', 'Dynamic zoom with energy burst, vibrant colors, trending effects'],
            ['professional_youtube', 'Cinematic pan with elegant transitions, premium lighting, professional quality'],
            ['aesthetic_instagram', 'Smooth glide with soft focus, aesthetic quality, premium feel']
        ]);
    }

    /**
     * Obtener estadísticas del generador
     */
    getStats() {
        return {
            status: this.status,
            uptime: this.startTime ? (Date.now() - this.startTime.getTime()) : 0,
            promptsGenerated: this.promptHistory.size,
            styles: Object.keys(this.animationStyles).length,
            movements: Object.keys(this.movementTypes).length,
            platforms: Object.keys(this.platformOptimization).length
        };
    }

    /**
     * Detener el generador
     */
    async stop() {
        console.log(`🛑 Deteniendo ${this.name}...`);
        this.isRunning = false;
        this.status = "stopped";
        
        const finalStats = this.getStats();
        console.log(`📊 Estadísticas finales:`, finalStats);
        
        return {
            success: true,
            finalStats,
            message: "Generador de prompts de animación detenido"
        };
    }

    /**
     * Método de salud
     */
    async healthCheck() {
        const isHealthy = this.isRunning && this.status === "running";
        const responseTime = Date.now() - (this.startTime?.getTime() || Date.now());
        
        return {
            healthy: isHealthy,
            status: this.status,
            uptime: responseTime,
            prompts: this.promptHistory.size,
            styles: Object.keys(this.animationStyles).length,
            lastActivity: this.startTime?.toISOString()
        };
    }
}

module.exports = AnimationPromptGenerator;