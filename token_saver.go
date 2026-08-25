// Token-saving directives: optional prompt-level disciplines injected into
// every new session (chat + automations) when the user enables them.
package main

import (
	"strings"

	"mncode/pkg/config"
)

const rtkDirective = "Shell output compression: the `rtk` CLI is installed on this machine. " +
	"Prefix common development commands with `rtk` (for example `rtk git log --oneline -20`, `rtk npm test`, `rtk go build ./...`) " +
	"so their output is token-compressed. If an rtk-wrapped command fails, fall back to the raw command."

// CheckRtkInstalled exposes rtk detection to the settings UI.
func (a *App) CheckRtkInstalled() bool {
	return rtkInstalled()
}

// tokenSaverDirectives builds the extra custom-instruction block for the
// enabled token savers. Returned slice entries are appended to the user's own
// custom instructions at session build time — the stored instructions are
// never modified.
func tokenSaverDirectives(cfg *config.Config) []string {
	directives := []string{}
	if settingBool(cfg, "token_saver_concise", false) {
		directives = append(directives,
			"Token-saving mode: keep responses concise and direct. Summarize instead of quoting large blocks. Never repeat file contents you have already referenced.")
	}
	if settingBool(cfg, "token_saver_compress_output", false) {
		directives = append(directives,
			"Shell output discipline: when a command may produce long output, pipe it through `head -100`, `tail -50`, or `grep` filters. Never cat or print entire files; read the specific ranges you need.")
	}
	if settingBool(cfg, "token_saver_targeted_edits", false) {
		directives = append(directives,
			"Editing discipline: prefer search-and-replace edits (replace_file_content) over rewriting whole files, and read only the specific line ranges relevant to the change.")
	}
	if settingBool(cfg, "token_saver_rtk", false) && rtkInstalled() {
		directives = append(directives, rtkDirective)
	}
	return directives
}

// applyTokenSaverDirectives merges the enabled directives into the session
// config's custom instructions without touching the stored value.
func applyTokenSaverDirectives(cfg *config.Config) {
	directives := tokenSaverDirectives(cfg)
	if len(directives) == 0 {
		return
	}
	block := strings.Join(directives, "\n\n")
	existing := strings.TrimSpace(cfg.GetSetting("custom_instructions", ""))
	if existing == "" {
		cfg.SetSetting("custom_instructions", block)
	} else {
		cfg.SetSetting("custom_instructions", existing+"\n\n"+block)
	}
}
