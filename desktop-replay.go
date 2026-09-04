package main

import (
	"context"
	"fmt"

	"mncode/pkg/replay"
)

// DesktopTraceDetail combines trace manifest and events for UI inspection.
type DesktopTraceDetail struct {
	Trace  replay.Trace   `json:"trace"`
	Events []replay.Event `json:"events"`
}

// ListReplayTraces returns all recorded flight recorder traces.
func (a *App) ListReplayTraces() ([]replay.Trace, error) {
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return nil, err
	}
	st, err := replay.NewStore(ws)
	if err != nil {
		return nil, fmt.Errorf("init replay store: %w", err)
	}
	return st.List(context.Background())
}

// GetReplayTrace loads a specific flight recorder trace and its events.
func (a *App) GetReplayTrace(traceID string) (*DesktopTraceDetail, error) {
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return nil, err
	}
	st, err := replay.NewStore(ws)
	if err != nil {
		return nil, fmt.Errorf("init replay store: %w", err)
	}
	trace, events, err := st.Load(context.Background(), traceID)
	if err != nil {
		return nil, fmt.Errorf("load replay trace: %w", err)
	}
	return &DesktopTraceDetail{Trace: trace, Events: events}, nil
}

// GetReplayRecordingID returns the active recorder ID, or an empty string.
func (a *App) GetReplayRecordingID() string {
	if a == nil {
		return ""
	}
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	a.mu.RLock()
	session := a.session
	a.mu.RUnlock()
	if session == nil || session.session == nil {
		return ""
	}
	recorder := session.session.RecorderSnapshot()
	if ider, ok := recorder.(interface{ ID() string }); ok {
		return ider.ID()
	}
	return ""
}

// StartReplayRecording attaches a redacted lifecycle recorder to the active session.
func (a *App) StartReplayRecording() (string, error) {
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return "", err
	}
	sess, err := a.requireSession()
	if err != nil {
		return "", err
	}
	if sess.IsExecuting() {
		return "", fmt.Errorf("cannot start recording while an agent turn is running")
	}
	if sess.RecorderSnapshot() != nil {
		return "", fmt.Errorf("recording is already active")
	}
	store, err := replay.NewStore(ws)
	if err != nil {
		return "", fmt.Errorf("init replay store: %w", err)
	}
	sess.EnsureIdentity()
	meta := replay.Trace{}
	if sess.Config != nil {
		meta.Model = sess.Config.Model
		meta.Provider = string(sess.Config.Provider)
	}
	recorder, err := store.Start(context.Background(), sess.ID, meta)
	if err != nil {
		return "", fmt.Errorf("start replay recording: %w", err)
	}
	sess.SetRecorder(recorder)
	return recorder.ID(), nil
}

// StopReplayRecording finalizes and detaches the active lifecycle recorder.
func (a *App) StopReplayRecording() error {
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	if _, err := a.requireWorkspaceDir(); err != nil {
		return err
	}
	sess, err := a.requireSession()
	if err != nil {
		return err
	}
	if sess.IsExecuting() {
		return fmt.Errorf("cannot stop recording while an agent turn is running")
	}
	recorder := sess.RecorderSnapshot()
	closer, ok := recorder.(interface{ Close(bool) error })
	if !ok {
		return fmt.Errorf("recording is not active")
	}
	if err := closer.Close(true); err != nil {
		return fmt.Errorf("stop replay recording: %w", err)
	}
	sess.DetachRecorder()
	return nil
}

// ForkReplaySession forks a new active session from a specific trace step.
func (a *App) ForkReplaySession(traceID string, atStep int, newID string) error {
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return err
	}
	sess, err := a.requireSession()
	if err != nil {
		return err
	}
	st, err := replay.NewStore(ws)
	if err != nil {
		return fmt.Errorf("init replay store: %w", err)
	}
	forkRes, err := st.Fork(context.Background(), replay.ForkRequest{
		TraceID: traceID, At: int64(atStep), NewSessionID: newID,
	})
	if err != nil {
		return fmt.Errorf("fork trace: %w", err)
	}
	if err := sess.ActivateFork(forkRes.History, forkRes.SessionID); err != nil {
		return fmt.Errorf("activate fork: %w", err)
	}
	a.emit("session:forked", map[string]interface{}{"sessionID": forkRes.SessionID, "history": forkRes.History})
	return nil
}
