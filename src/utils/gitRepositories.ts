import type { VaultOption } from '../components/status-bar/types'
import { labelFromWorkspacePath, workspaceLabelFromVault } from './workspaces'

/** A git repository option shown in the UI, representing a vault with git tracking. */
export interface GitRepositoryOption {
  /** Absolute path to the git repository/vault directory. */
  path: string
  /** Human-readable display label (e.g. vault name). */
  label: string
  /** Whether this repository is the default target for new notes. */
  defaultForNewNotes: boolean
}

interface GitRepositoryOptionsInput {
  defaultVaultPath: string
  multiWorkspaceEnabled: boolean
  vaults: VaultOption[]
}

/** Derive a display label from a vault entry. */
function repositoryLabel(vault: Pick<VaultOption, 'label' | 'path'>): string {
  return workspaceLabelFromVault(vault)
}

/** Check whether a vault should be included as an active git repository. */
function includeVaultAsActiveRepository(
  vault: Pick<VaultOption, 'available' | 'managedDefault' | 'mounted' | 'path'>,
  defaultVaultPath: string,
): boolean {
  if (!vault.path.trim()) return false
  if (vault.available === false) return false
  if (vault.path === defaultVaultPath) return true
  return vault.mounted !== false
}

/** Add a vault to the repositories map if not already present. */
function addRepository(
  repositories: Map<string, GitRepositoryOption>,
  vault: Pick<VaultOption, 'label' | 'path'>,
  defaultVaultPath: string,
): void {
  if (!vault.path.trim() || repositories.has(vault.path)) return
  repositories.set(vault.path, {
    path: vault.path,
    label: repositoryLabel(vault),
    defaultForNewNotes: vault.path === defaultVaultPath,
  })
}

/**
 * Build the list of active git repositories from the user's vaults.
 *
 * If multi-workspace is disabled, only the default vault is included.
 * Otherwise, all mounted/available vaults are included.
 */
export function activeGitRepositories({
  defaultVaultPath,
  multiWorkspaceEnabled,
  vaults,
}: GitRepositoryOptionsInput): GitRepositoryOption[] {
  const repositories = new Map<string, GitRepositoryOption>()
  const defaultVault = vaults.find((vault) => vault.path === defaultVaultPath)
  if (defaultVaultPath.trim()) {
    addRepository(repositories, defaultVault ?? { label: labelFromWorkspacePath(defaultVaultPath), path: defaultVaultPath }, defaultVaultPath)
  }

  if (!multiWorkspaceEnabled) return [...repositories.values()]

  for (const vault of vaults) {
    if (includeVaultAsActiveRepository(vault, defaultVaultPath)) {
      addRepository(repositories, vault, defaultVaultPath)
    }
  }

  return [...repositories.values()]
}

/**
 * Validate and return a git repository path, falling back through alternatives.
 *
 * Priority: provided path → fallbackPath → first available repository → fallbackPath.
 */
export function validGitRepositoryPath(
  path: string | null | undefined,
  repositories: readonly GitRepositoryOption[],
  fallbackPath: string,
): string {
  if (path && repositories.some((repository) => repository.path === path)) return path
  if (repositories.some((repository) => repository.path === fallbackPath)) return fallbackPath
  return repositories[0]?.path ?? fallbackPath
}

/** Look up the display label for a git repository path. */
export function gitRepositoryLabel(
  path: string,
  repositories: readonly GitRepositoryOption[],
): string {
  return repositories.find((repository) => repository.path === path)?.label ?? labelFromWorkspacePath(path)
}
