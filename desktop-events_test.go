package main

import "testing"

func TestDesktopUIKeepsBoundRunIDAfterAppRunChanges(t *testing.T) {
	app := NewApp()
	app.activeRun = 42
	ui := newDesktopUI(app, "/workspace", 7)

	if got, want := ui.eventRunID(), uint64(7); got != want {
		t.Fatalf("eventRunID() = %d, want %d", got, want)
	}

	app.activeRun = 99
	if got, want := ui.eventRunID(), uint64(7); got != want {
		t.Fatalf("eventRunID() changed with app activeRun: got %d, want %d", got, want)
	}
}
