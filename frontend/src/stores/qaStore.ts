import { create } from 'zustand';
import { 
  QAUIPreferences, 
  QAVerificationResult, 
  HallucinationResult, 
  SourceVerificationResult,
  QASystemHealth,
  QANotification,
  BatchVerificationResult
} from '@/types';

interface QAStore {
  // State
  preferences: QAUIPreferences;
  activeVerifications: Map<string, QAVerificationResult>;
  recentResults: Array<QAVerificationResult | HallucinationResult | SourceVerificationResult>;
  systemHealth: QASystemHealth | null;
  isInitialized: boolean;
  notifications: QANotification[];
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => void;
  setPreferences: (preferences: Partial<QAUIPreferences>) => void;
  addVerification: (id: string, verification: QAVerificationResult) => void;
  updateVerification: (id: string, verification: Partial<QAVerificationResult>) => void;
  removeVerification: (id: string) => void;
  addRecentResult: (result: QAVerificationResult | HallucinationResult | SourceVerificationResult) => void;
  clearRecentResults: () => void;
  setSystemHealth: (health: QASystemHealth) => void;
  addNotification: (notification: Omit<QANotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Getters
  getActiveVerification: (id: string) => QAVerificationResult | undefined;
  getVerificationCount: () => number;
  getAverageConfidence: () => number;
  getSuccessRate: () => number;
  getHighRiskResults: () => Array<HallucinationResult>;
  getUnreliableSources: () => Array<SourceVerificationResult>;
}

const defaultPreferences: QAUIPreferences = {
  autoVerify: true,
  showConfidence: true,
  showSources: true,
  strictMode: false,
  sensitivity: 0.5,
  enableRealTime: true,
  notifications: {
    verificationComplete: true,
    hallucinationDetected: true,
    sourceWarning: true
  }
};

export const useQAStore = create<QAStore>()(
    (set, get) => ({
      // Initial State
      preferences: defaultPreferences,
      activeVerifications: new Map(),
      recentResults: [],
      systemHealth: null,
      isInitialized: false,
      notifications: [],
      isLoading: false,
      error: null,

      // Actions
      initialize: () => {
        set((state) => ({
          ...state,
          isInitialized: true
        }));
        
        // Load preferences from localStorage
        if (typeof window !== 'undefined') {
          const savedPreferences = localStorage.getItem('qa-preferences');
          if (savedPreferences) {
            try {
              const parsed = JSON.parse(savedPreferences);
              get().setPreferences(parsed);
            } catch (error) {
              console.warn('Failed to load QA preferences from localStorage:', error);
            }
          }
        }
      },

      setPreferences: (newPreferences) => {
        set((state) => {
          const updated = { ...state.preferences, ...newPreferences };
          
          // Save to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('qa-preferences', JSON.stringify(updated));
          }
          
          return {
            ...state,
            preferences: updated
          };
        });
      },

      addVerification: (id, verification) => {
        set((state) => {
          const newActiveVerifications = new Map(state.activeVerifications);
          newActiveVerifications.set(id, verification);
          
          return {
            ...state,
            activeVerifications: newActiveVerifications
          };
        });
      },

      updateVerification: (id, updates) => {
        set((state) => {
          const newActiveVerifications = new Map(state.activeVerifications);
          const existing = newActiveVerifications.get(id);
          
          if (existing) {
            newActiveVerifications.set(id, { ...existing, ...updates });
          }
          
          return {
            ...state,
            activeVerifications: newActiveVerifications
          };
        });
      },

      removeVerification: (id) => {
        set((state) => {
          const newActiveVerifications = new Map(state.activeVerifications);
          newActiveVerifications.delete(id);
          
          return {
            ...state,
            activeVerifications: newActiveVerifications
          };
        });
      },

      addRecentResult: (result) => {
        set((state) => {
          // Add to recent results (keep only last 50)
          const newRecentResults = [result, ...state.recentResults].slice(0, 50);
          
          return {
            ...state,
            recentResults: newRecentResults
          };
        });
      },

      clearRecentResults: () => {
        set((state) => ({
          ...state,
          recentResults: []
        }));
      },

      setSystemHealth: (health) => {
        set((state) => ({
          ...state,
          systemHealth: health
        }));
      },

      addNotification: (notificationData) => {
        const notification: QANotification = {
          ...notificationData,
          id: `qa-notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString()
        };

        set((state) => ({
          ...state,
          notifications: [notification, ...state.notifications]
        }));

        // Auto-remove success notifications after 5 seconds
        if (notification.type === 'success') {
          setTimeout(() => {
            get().removeNotification(notification.id);
          }, 5000);
        }
      },

      removeNotification: (id) => {
        set((state) => ({
          ...state,
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },

      clearNotifications: () => {
        set((state) => ({
          ...state,
          notifications: []
        }));
      },

      setLoading: (loading) => {
        set((state) => ({
          ...state,
          isLoading: loading
        }));
      },

      setError: (error) => {
        set((state) => ({
          ...state,
          error
        }));
      },

      // Getters
      getActiveVerification: (id) => {
        return get().activeVerifications.get(id);
      },

      getVerificationCount: () => {
        return get().activeVerifications.size;
      },

      getAverageConfidence: () => {
        const { activeVerifications } = get();
        if (activeVerifications.size === 0) return 0;
        
        const totalConfidence = Array.from(activeVerifications.values())
          .reduce((sum, verification) => sum + verification.confidence, 0);
        
        return totalConfidence / activeVerifications.size;
      },

      getSuccessRate: () => {
        const { recentResults } = get();
        if (recentResults.length === 0) return 0;
        
        const successful = recentResults.filter(result => {
          if ('verification' in result) {
            return result.verification.isVerified;
          } else if ('detection' in result) {
            return !result.detection.isHallucination;
          } else {
            return result.overallAssessment.recommendation === 'trust';
          }
        });
        
        return successful.length / recentResults.length;
      },

      getHighRiskResults: () => {
        const { recentResults } = get();
        return recentResults.filter(result => {
          return 'detection' in result && result.detection.riskLevel === 'critical';
        }) as HallucinationResult[];
      },

      getUnreliableSources: () => {
        const { recentResults } = get();
        return recentResults.filter(result => {
          return 'overallAssessment' in result && 
                 (result.overallAssessment.recommendation === 'avoid' || 
                  result.overallAssessment.recommendation === 'insufficient');
        }) as SourceVerificationResult[];
      }
    }),
    {
      name: 'qa-store'
    }
  );

// Initialize store on import
if (typeof window !== 'undefined') {
  useQAStore.getState().initialize();
}