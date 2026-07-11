import { useCallback, useEffect, useRef, useState } from 'react'
import { CloudArrowUp, LinkBreak, PlugsConnected } from '@phosphor-icons/react'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { createTranslator } from '../lib/i18n'
import { isTauri } from '../mock-tauri'
import { Button } from './ui/button'
import {
  SectionHeading,
  SettingsGroup,
  SettingsRow,
  SettingsSwitchRow,
} from './SettingsControls'

type Translate = ReturnType<typeof createTranslator>

export interface WebdavSyncStatus {
  connected: boolean
  lastSyncAt: number | null
  filesUploaded: number
  filesDownloaded: number
}

export interface WebdavSyncSettingsSectionProps {
  serverUrl: string
  username: string
  password: string
  remotePath: string
  enabled: boolean
  syncStatus: WebdavSyncStatus
  setServerUrl: (value: string) => void
  setUsername: (value: string) => void
  setPassword: (value: string) => void
  setRemotePath: (value: string) => void
  setEnabled: (value: boolean) => void
  onTestConnection: () => Promise<string | null>
  onSyncNow: () => Promise<WebdavSyncStatus | null>
  t: Translate
}

interface SyncProgress {
  current: number
  total: number
  phase: string
}

function formatLastSyncTime(unixSeconds: number | null, t: Translate): string {
  if (unixSeconds === null) return t('settings.webdav.neverSynced')
  const date = new Date(unixSeconds * 1000)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)

  if (diffMinutes < 1) return t('status.sync.justNow')
  if (diffMinutes < 60) return t('status.sync.minutesAgo', { minutes: diffMinutes })
  return date.toLocaleString()
}

function phaseLabel(phase: string, t: Translate): string {
  switch (phase) {
    case 'connecting':
      return t('settings.webdav.progress.connecting')
    case 'ensuring-remote-dir':
      return t('settings.webdav.progress.ensuringDir')
    case 'collecting':
      return t('settings.webdav.progress.collecting')
    case 'uploading':
      return t('settings.webdav.progress.uploading')
    case 'downloading':
      return t('settings.webdav.progress.downloading')
    case 'done':
      return t('settings.webdav.progress.done')
    default:
      return phase
  }
}

export function WebdavSyncSettingsSection(props: WebdavSyncSettingsSectionProps) {
  const {
    serverUrl,
    username,
    password,
    remotePath,
    enabled,
    syncStatus,
    setServerUrl,
    setUsername,
    setPassword,
    setRemotePath,
    setEnabled,
    onTestConnection,
    onSyncNow,
    t,
  } = props

  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'failure'>('idle')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<WebdavSyncStatus | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const unlistenRef = useRef<UnlistenFn | null>(null)

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      unlistenRef.current?.()
      unlistenRef.current = null
    }
  }, [])

  const handleTestConnection = useCallback(async () => {
    setTestingConnection(true)
    setTestResult('idle')
    setTestError(null)
    try {
      const error = await onTestConnection()
      if (error === null) {
        setTestResult('success')
      } else {
        setTestResult('failure')
        setTestError(error)
      }
    } catch {
      setTestResult('failure')
      setTestError(t('settings.webdav.testFailure', { error: 'Unknown error' }))
    } finally {
      setTestingConnection(false)
    }
  }, [onTestConnection, t])

  const handleSyncNow = useCallback(async () => {
    setSyncing(true)
    setSyncProgress({ current: 0, total: 0, phase: 'connecting' })

    // Set up progress listener
    if (isTauri()) {
      try {
        const unlisten = await listen<SyncProgress>('webdav-sync-progress', (event) => {
          setSyncProgress(event.payload)
        })
        unlistenRef.current = unlisten
      } catch {
        // Swallow — progress display degrades gracefully
      }
    }

    try {
      const result = await onSyncNow()
      if (result) {
        setSyncResult(result)
        setSyncProgress({ current: 1, total: 1, phase: 'done' })
      }
    } catch {
      // Sync error is handled by the parent
    } finally {
      // Clean up listener
      unlistenRef.current?.()
      unlistenRef.current = null
      setSyncing(false)
    }
  }, [onSyncNow])

  const displayStatus = syncResult ?? syncStatus
  const lastSyncLabel = formatLastSyncTime(displayStatus.lastSyncAt, t)

  const progressPercent = syncProgress && syncProgress.total > 0
    ? Math.round((syncProgress.current / syncProgress.total) * 100)
    : null

  return (
    <>
      <SectionHeading
        icon={<CloudArrowUp size={16} aria-hidden="true" />}
        title={t('settings.webdav.title')}
      />

      <SettingsGroup>
        <SettingsSwitchRow
          label={t('settings.webdav.enable')}
          description={t('settings.webdav.enableDescription')}
          checked={enabled}
          onChange={setEnabled}
          testId="settings-webdav-enabled"
        />

        <SettingsRow
          label={t('settings.webdav.serverUrl')}
          controlWidth="wide"
          testId="settings-webdav-server-url"
        >
          <input
            type="url"
            className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t('settings.webdav.serverUrlPlaceholder')}
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            disabled={!enabled}
            aria-label={t('settings.webdav.serverUrl')}
            data-testid="settings-webdav-server-url-input"
          />
        </SettingsRow>

        <SettingsRow
          label={t('settings.webdav.username')}
          testId="settings-webdav-username"
        >
          <input
            type="text"
            className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t('settings.webdav.usernamePlaceholder')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={!enabled}
            autoComplete="username"
            aria-label={t('settings.webdav.username')}
            data-testid="settings-webdav-username-input"
          />
        </SettingsRow>

        <SettingsRow
          label={t('settings.webdav.password')}
          testId="settings-webdav-password"
        >
          <input
            type="password"
            className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t('settings.webdav.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!enabled}
            autoComplete="current-password"
            aria-label={t('settings.webdav.password')}
            data-testid="settings-webdav-password-input"
          />
        </SettingsRow>

        <SettingsRow
          label={t('settings.webdav.remotePath')}
          description={t('settings.webdav.remotePathDescription')}
          testId="settings-webdav-remote-path"
        >
          <input
            type="text"
            className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t('settings.webdav.remotePathPlaceholder')}
            value={remotePath}
            onChange={(e) => setRemotePath(e.target.value)}
            disabled={!enabled}
            aria-label={t('settings.webdav.remotePath')}
            data-testid="settings-webdav-remote-path-input"
          />
        </SettingsRow>
      </SettingsGroup>

      {/* Connection and sync actions */}
      <div className="mt-2 flex flex-wrap items-center gap-3 px-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={!enabled || testingConnection || !serverUrl}
          data-testid="settings-webdav-test-connection"
        >
          <PlugsConnected size={14} className="mr-1.5" aria-hidden="true" />
          {testingConnection ? t('settings.webdav.testingConnection') : t('settings.webdav.testConnection')}
        </Button>

        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleSyncNow}
          disabled={!enabled || syncing || !serverUrl}
          data-testid="settings-webdav-sync-now"
        >
          <CloudArrowUp size={14} className="mr-1.5" aria-hidden="true" />
          {syncing ? t('settings.webdav.syncing') : t('settings.webdav.syncNow')}
        </Button>
      </div>

      {/* Progress bar (shown during sync) */}
      {syncing && syncProgress && syncProgress.total > 0 && (
        <div
          className="mt-3 px-1"
          data-testid="settings-webdav-sync-progress"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{phaseLabel(syncProgress.phase, t)}</span>
            <span>
              {syncProgress.current}/{syncProgress.total}
              {progressPercent !== null ? ` (${progressPercent}%)` : ''}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progressPercent ?? 0, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Indeterminate progress (connecting/collecting phases) */}
      {syncing && syncProgress && syncProgress.total === 0 && (
        <div
          className="mt-3 px-1"
          data-testid="settings-webdav-sync-progress-indeterminate"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{phaseLabel(syncProgress.phase, t)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      )}

      {/* Test connection result */}
      {testResult === 'success' && (
        <div
          className="mt-2 flex items-center gap-2 rounded-md border border-green-600/30 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-500/30 dark:bg-green-950/30 dark:text-green-400"
          data-testid="settings-webdav-test-success"
        >
          <PlugsConnected size={14} weight="fill" aria-hidden="true" />
          <span>{t('settings.webdav.testSuccess')}</span>
        </div>
      )}
      {testResult === 'failure' && (
        <div
          className="mt-2 flex items-center gap-2 rounded-md border border-red-600/30 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-400"
          data-testid="settings-webdav-test-failure"
        >
          <LinkBreak size={14} weight="fill" aria-hidden="true" />
          <span>{testError ?? t('settings.webdav.testFailure', { error: '' })}</span>
        </div>
      )}

      {/* Sync status display */}
      <div className="mt-3 space-y-1 rounded-md border border-border bg-card px-3 py-2.5" data-testid="settings-webdav-sync-status">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-current" style={{
            backgroundColor: enabled && displayStatus.connected ? 'var(--color-green-500, #22c55e)' : 'var(--color-gray-400, #9ca3af)',
          }} />
          <span>
            {enabled ? t('settings.webdav.statusEnabled') : t('settings.webdav.statusDisabled')}
            {enabled && displayStatus.connected ? ` · ${t('settings.webdav.testSuccess')}` : ''}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {t('settings.webdav.syncProgress', { time: lastSyncLabel })}
        </div>
        {(displayStatus.filesUploaded > 0) && (
          <div className="text-xs text-muted-foreground">
            {t('settings.webdav.uploadedCount', { count: displayStatus.filesUploaded })} ·{' '}
            {t('settings.webdav.downloadedCount', { count: displayStatus.filesDownloaded })}
          </div>
        )}
      </div>
    </>
  )
}
