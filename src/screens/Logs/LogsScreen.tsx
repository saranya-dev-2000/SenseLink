import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Dialog,
  Icon,
  IconButton,
  Portal,
  Text,
} from 'react-native-paper';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import {
  CommunicationMessage,
  useBluetooth,
} from '../../context/BluetoothContext';

type LogFilter = 'all' | 'sent' | 'received';

const FILTERS: Array<{ label: string; value: LogFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Sent', value: 'sent' },
  { label: 'Received', value: 'received' },
];

function formatLogTime(timestamp: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

export function LogsScreen() {
  const { communicationLogs, clearCommunicationLogs } = useBluetooth();
  const [selectedFilter, setSelectedFilter] = useState<LogFilter>('all');
  const [clearDialogVisible, setClearDialogVisible] = useState(false);

  const filteredLogs = useMemo(() => {
    const logs =
      selectedFilter === 'all'
        ? communicationLogs
        : communicationLogs.filter(log => log.type === selectedFilter);

    return [...logs].reverse();
  }, [communicationLogs, selectedFilter]);

  const handleConfirmClear = useCallback(() => {
    clearCommunicationLogs();
    setClearDialogVisible(false);
  }, [clearCommunicationLogs]);

  const renderLog: ListRenderItem<CommunicationMessage> = ({ item }) => {
    const isSent = item.type === 'sent';

    return (
      <Card
        mode="contained"
        style={[styles.logCard, isSent ? styles.sentCard : styles.receivedCard]}>
        <Card.Content>
          <View style={styles.logHeader}>
            <View style={styles.logTypeRow}>
              <Icon
                source={isSent ? 'arrow-up-right' : 'arrow-down-left'}
                color={isSent ? colors.primary : colors.success}
                size={20}
              />
              <Text variant="labelLarge" style={styles.logType}>
                {isSent ? 'SENT' : 'RECEIVED'}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.timestamp}>
              {formatLogTime(item.timestamp)}
            </Text>
          </View>

          <Text variant="bodyLarge" style={styles.message}>
            {item.message}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="headlineMedium" style={styles.title}>
            Communication Logs
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Sent commands and received sensor messages.
          </Text>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.countBadge}>
            <Text variant="titleMedium" style={styles.countText}>
              {communicationLogs.length}
            </Text>
            <Text variant="labelSmall" style={styles.countLabel}>
              logs
            </Text>
          </View>
          <IconButton
            icon="trash-can-outline"
            iconColor={colors.error}
            size={22}
            disabled={communicationLogs.length === 0}
            style={styles.clearButton}
            onPress={() => setClearDialogVisible(true)}
          />
        </View>
      </View>

      <View style={styles.filters}>
        {FILTERS.map(filter => {
          const selected = selectedFilter === filter.value;

          return (
            <Button
              key={filter.value}
              mode={selected ? 'contained' : 'outlined'}
              compact
              buttonColor={selected ? colors.primary : undefined}
              textColor={selected ? colors.text : colors.textGrey}
              style={styles.filterButton}
              contentStyle={styles.filterButtonContent}
              onPress={() => setSelectedFilter(filter.value)}>
              {filter.label}
            </Button>
          );
        })}
      </View>

      <FlatList
        data={filteredLogs}
        keyExtractor={item => item.id}
        renderItem={renderLog}
        contentContainerStyle={[
          styles.listContent,
          filteredLogs.length === 0 && styles.emptyListContent,
        ]}
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        ListEmptyComponent={
          <Card mode="contained" style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon source="clipboard-text-off-outline" color={colors.textGrey} size={42} />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                No communication logs
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Connect to a device and start sending commands.
              </Text>
            </Card.Content>
          </Card>
        }
      />

      <Portal>
        <Dialog
          visible={clearDialogVisible}
          onDismiss={() => setClearDialogVisible(false)}
          style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>
            Clear Communication Logs
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogMessage}>
              Are you sure you want to delete all logs?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.textGrey} onPress={() => setClearDialogVisible(false)}>
              Cancel
            </Button>
            <Button textColor={colors.error} onPress={handleConfirmClear}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textGrey,
    marginTop: theme.spacing.xs,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  countBadge: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: '#30363D',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    minWidth: 58,
    padding: theme.spacing.sm,
  },
  countText: {
    color: colors.primary,
    fontWeight: '800',
  },
  countLabel: {
    color: colors.textGrey,
    marginTop: 2,
  },
  clearButton: {
    backgroundColor: '#2D1517',
    borderRadius: theme.radius.md,
    margin: 0,
  },
  filters: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  filterButton: {
    borderColor: '#30363D',
    borderRadius: theme.radius.md,
    flex: 1,
  },
  filterButtonContent: {
    minHeight: 40,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  logCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    elevation: 3,
    marginBottom: theme.spacing.md,
  },
  sentCard: {
    backgroundColor: '#102A43',
    borderColor: '#1F6FEB',
  },
  receivedCard: {
    backgroundColor: '#16301F',
    borderColor: '#238636',
  },
  logHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  logTypeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  logType: {
    color: colors.text,
    fontWeight: '800',
  },
  timestamp: {
    color: colors.textGrey,
  },
  message: {
    color: colors.text,
    lineHeight: 24,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderColor: '#30363D',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '700',
    marginTop: theme.spacing.md,
  },
  emptyText: {
    color: colors.textGrey,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: theme.radius.md,
  },
  dialogTitle: {
    color: colors.text,
  },
  dialogMessage: {
    color: colors.textGrey,
  },
});
