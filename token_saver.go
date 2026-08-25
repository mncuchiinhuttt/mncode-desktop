// Token-saving toggles: directive generation and proxy management live in the
// shared agent core (mncode/pkg/config) so the CLI and Desktop stay in sync.
package main

import (
	"mncode/pkg/config"
)

// CheckRtkInstalled exposes rtk detection to the settings UI.
func (a *App) CheckRtkInstalled() bool {
	return config.RTKInstalled()
}
