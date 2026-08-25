package main

import (
	"testing"
	"time"
)

func TestNextRunForComputesNextFire(t *testing.T) {
	// Wed Aug 26 2026, 10:30 — the next "0 9 * * 1-5" fire is Thursday 09:00.
	now := time.Date(2026, 8, 26, 10, 30, 0, 0, time.UTC)
	next, err := nextRunFor("0 9 * * 1-5", now)
	if err != nil {
		t.Fatalf("nextRunFor: %v", err)
	}
	want := time.Date(2026, 8, 27, 9, 0, 0, 0, time.UTC)
	if !next.Equal(want) {
		t.Fatalf("next = %v, want %v", next, want)
	}
}

func TestNextRunForRejectsInvalidSpec(t *testing.T) {
	if _, err := nextRunFor("not a cron", time.Now()); err == nil {
		t.Fatal("invalid spec must error")
	}
}

func TestIdleDue(t *testing.T) {
	now := time.Now()
	cases := []struct {
		name      string
		lastRunAt int64
		want      bool
	}{
		{"never run", 0, true},
		{"ran 31 minutes ago", now.Add(-31 * time.Minute).UnixMilli(), true},
		{"ran 10 minutes ago", now.Add(-10 * time.Minute).UnixMilli(), false},
	}
	for _, testCase := range cases {
		if got := idleDue(testCase.lastRunAt, now); got != testCase.want {
			t.Fatalf("%s: idleDue = %v, want %v", testCase.name, got, testCase.want)
		}
	}
}
