import React from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { IconButton, Surface, Text, useTheme } from 'react-native-paper'
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'

interface AppModalProps {
  visible: boolean
  title: string
  onDismiss: () => void
  headerIcon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  expanded?: boolean
  contentKey?: string | number
  blurTarget?: React.RefObject<View | null>
  dismissable?: boolean
}

function AppModalContent({
  title,
  onDismiss,
  headerIcon,
  children,
  footer,
  expanded = false,
  contentKey,
  dismissable = true,
}: Omit<AppModalProps, 'visible'>) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const availableHeight = Math.max(0, height - insets.top - insets.bottom - 40)

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom', 'left', 'right']}
      pointerEvents="box-none"
    >
      <Surface
        elevation={3}
        accessibilityViewIsModal
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            maxHeight: availableHeight,
            height: expanded ? Math.min(availableHeight, height * 0.88) : undefined,
          },
        ]}
      >
        <View style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}>
          {headerIcon}
          <Text variant="titleLarge" numberOfLines={3} style={styles.title}>
            {title}
          </Text>
          <IconButton
            icon="close"
            accessibilityLabel={`Close ${title}`}
            onPress={onDismiss}
            disabled={!dismissable}
            style={styles.closeButton}
          />
        </View>
        <ScrollView
          key={contentKey ?? title}
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
        >
          {children}
          {!expanded && footer && <View style={styles.footer}>{footer}</View>}
        </ScrollView>
        {expanded && footer && (
          <View
            style={[
              styles.footer,
              styles.fixedFooter,
              { borderTopColor: theme.colors.outlineVariant },
            ]}
          >
            {footer}
          </View>
        )}
      </Surface>
    </SafeAreaView>
  )
}

export default function AppModal({
  visible,
  onDismiss,
  blurTarget,
  dismissable = true,
  ...props
}: AppModalProps) {
  const theme = useTheme()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={() => { if (dismissable) onDismiss() }}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SafeAreaProvider>
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={45}
          tint={theme.dark ? 'dark' : 'light'}
          blurTarget={blurTarget}
          blurMethod={blurTarget ? 'dimezisBlurViewSdk31Plus' : 'none'}
          pointerEvents="none"
          accessible={false}
        />
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: theme.dark
                ? 'rgba(0, 0, 0, 0.24)'
                : 'rgba(25, 28, 30, 0.14)',
            },
          ]}
          onPress={dismissable ? onDismiss : undefined}
          accessible={false}
        />
        <AppModalContent {...props} onDismiss={onDismiss} dismissable={dismissable} />
      </SafeAreaProvider>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    flexShrink: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    fontWeight: '600',
  },
  closeButton: {
    margin: 0,
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  fixedFooter: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
