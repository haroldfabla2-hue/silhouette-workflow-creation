import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, theme, isSmallScreen } from '../../theme';
import CustomButton from '../../components/ui/CustomButton';
import {
  fetchWorkflows,
  selectWorkflows,
  selectWorkflowsLoading,
  selectWorkflowsPagination,
  selectWorkflowsError,
  selectSelectedWorkflows,
  selectWorkflowsFilters,
  selectSearchQuery,
  setSearchQuery,
  setFilters,
  setSort,
  selectWorkflow,
  selectAllWorkflows,
  clearSelection,
  deleteWorkflow,
} from '../../store/slices/workflowsSlice';
import { showToast } from '../../store/slices/uiSlice';

const WorkflowsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  
  const workflows = useSelector(selectWorkflows);
  const isLoading = useSelector(selectWorkflowsLoading);
  const pagination = useSelector(selectWorkflowsPagination);
  const error = useSelector(selectWorkflowsError);
  const selectedWorkflows = useSelector(selectSelectedWorkflows);
  const filters = useSelector(selectWorkflowsFilters);
  const searchQuery = useSelector(selectSearchQuery);
  
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const loadWorkflows = async () => {
    try {
      await dispatch(fetchWorkflows({
        page: 1,
        limit: 20,
        search: searchQuery,
        ...filters,
      }));
    } catch (error) {
      console.error('Error cargando workflows:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkflows();
    setRefreshing(false);
  };

  const handleSearch = () => {
    dispatch(setSearchQuery(localSearchQuery));
    loadWorkflows();
  };

  const handleFilterChange = (newFilters) => {
    dispatch(setFilters(newFilters));
    setShowFilterModal(false);
    loadWorkflows();
  };

  const handleWorkflowPress = (workflow) => {
    navigation.navigate('WorkflowEditor', { workflowId: workflow.id });
  };

  const handleCreateWorkflow = () => {
    navigation.navigate('WorkflowEditor', { isNew: true });
  };

  const handleExecuteWorkflow = (workflow) => {
    navigation.navigate('WorkflowExecution', { workflowId: workflow.id });
  };

  const handleLongPress = (workflowId) => {
    dispatch(selectWorkflow(workflowId));
  };

  const handleSelectAll = () => {
    dispatch(selectAllWorkflows());
  };

  const handleClearSelection = () => {
    dispatch(clearSelection());
  };

  const handleBulkDelete = async () => {
    if (selectedWorkflows.length === 0) return;
    
    Alert.alert(
      'Eliminar Workflows',
      `¿Estás seguro de que quieres eliminar ${selectedWorkflows.length} workflow(s)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            for (const workflowId of selectedWorkflows) {
              try {
                await dispatch(deleteWorkflow(workflowId));
              } catch (error) {
                console.error('Error eliminando workflow:', error);
              }
            }
            dispatch(clearSelection());
            dispatch(showToast({
              message: `${selectedWorkflows.length} workflow(s) eliminado(s)`,
              type: 'success',
            }));
          },
        },
      ]
    );
  };

  const renderWorkflowItem = ({ item: workflow }) => {
    const isSelected = selectedWorkflows.includes(workflow.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.workflowCard,
          isSelected && styles.workflowCardSelected,
        ]}
        onPress={() => handleWorkflowPress(workflow)}
        onLongPress={() => handleLongPress(workflow.id)}
        activeOpacity={0.7}
      >
        <View style={styles.workflowHeader}>
          <View style={styles.workflowIcon}>
            <Icon 
              name="account-tree" 
              size={24} 
              color={workflow.status === 'active' ? colors.success : colors.textSecondary} 
            />
          </View>
          <View style={styles.workflowInfo}>
            <Text style={styles.workflowName}>{workflow.name}</Text>
            <Text style={styles.workflowDescription}>
              {workflow.description || 'Sin descripción'}
            </Text>
          </View>
          <View style={styles.workflowStatus}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: workflow.status === 'active' ? colors.success : colors.textLight }
            ]}>
              <Text style={styles.statusText}>
                {workflow.status === 'active' ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.workflowMeta}>
          <View style={styles.metaItem}>
            <Icon name="schedule" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              Actualizado: {new Date(workflow.updatedAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="play-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {workflow.executionsCount || 0} ejecuciones
            </Text>
          </View>
        </View>
        
        <View style={styles.workflowActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleExecuteWorkflow(workflow)}
          >
            <Icon name="play-arrow" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleWorkflowPress(workflow)}
          >
            <Icon name="edit" size={20} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Alert.alert(
                'Eliminar Workflow',
                '¿Estás seguro de que quieres eliminar este workflow?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => dispatch(deleteWorkflow(workflow.id)),
                  },
                ]
              );
            }}
          >
            <Icon name="delete" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.screenTitle}>Mis Workflows</Text>
      <Text style={styles.screenSubtitle}>
        Gestiona y ejecuta tus flujos de trabajo
      </Text>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar workflows..."
          value={localSearchQuery}
          onChangeText={setLocalSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {localSearchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setLocalSearchQuery('')}>
            <Icon name="clear" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilterModal(true)}
      >
        <Icon 
          name="filter-list" 
          size={20} 
          color={Object.values(filters).some(f => f !== 'all') ? colors.primary : colors.textSecondary} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderBulkActions = () => {
    if (selectedWorkflows.length === 0) return null;
    
    return (
      <View style={styles.bulkActions}>
        <TouchableOpacity style={styles.bulkAction} onPress={handleSelectAll}>
          <Icon name="select-all" size={20} color={colors.primary} />
          <Text style={styles.bulkActionText}>Seleccionar todo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkAction} onPress={handleClearSelection}>
          <Icon name="clear" size={20} color={colors.textSecondary} />
          <Text style={styles.bulkActionText}>Limpiar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkAction} onPress={handleBulkDelete}>
          <Icon name="delete" size={20} color={colors.error} />
          <Text style={styles.bulkActionText}>
            Eliminar ({selectedWorkflows.length})
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Estado</Text>
            <View style={styles.filterOptions}>
              {['all', 'active', 'inactive'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    filters.status === status && styles.filterOptionSelected
                  ]}
                  onPress={() => handleFilterChange({ status })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.status === status && styles.filterOptionTextSelected
                  ]}>
                    {status === 'all' ? 'Todos' : status === 'active' ? 'Activos' : 'Inactivos'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.modalActions}>
            <CustomButton
              title="Aplicar Filtros"
              onPress={() => setShowFilterModal(false)}
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="account-tree" size={64} color={colors.textLight} />
      <Text style={styles.emptyStateText}>
        {searchQuery ? 'No se encontraron workflows' : 'No tienes workflows aún'}
      </Text>
      <Text style={styles.emptyStateSubtext}>
        {searchQuery 
          ? 'Intenta con otros términos de búsqueda' 
          : 'Crea tu primer workflow para comenzar'
        }
      </Text>
      {!searchQuery && (
        <CustomButton
          title="Crear Primer Workflow"
          onPress={handleCreateWorkflow}
          style={styles.createFirstButton}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderSearchBar()}
      {renderBulkActions()}
      
      <FlatList
        data={workflows}
        renderItem={renderWorkflowItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing || isLoading} 
            onRefresh={onRefresh} 
            colors={[colors.primary]} 
          />
        }
        ListEmptyComponent={!isLoading && renderEmptyState()}
      />
      
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateWorkflow}
      >
        <Icon name="add" size={24} color={colors.surface} />
      </TouchableOpacity>
      
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.small,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  bulkActions: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight + '20',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  bulkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  bulkActionText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100, // Espacio para el FAB
  },
  workflowCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  workflowCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  workflowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  workflowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  workflowInfo: {
    flex: 1,
  },
  workflowName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  workflowDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  workflowStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.surface,
  },
  workflowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  workflowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  createFirstButton: {
    minWidth: 200,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.large,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  filterSection: {
    marginBottom: theme.spacing.xl,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  filterOptionTextSelected: {
    color: colors.surface,
    fontWeight: '500',
  },
  modalActions: {
    marginTop: theme.spacing.lg,
  },
});

export default WorkflowsScreen;