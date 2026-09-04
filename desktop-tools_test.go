package main

import (
	"os"
	"path/filepath"
	"testing"

	"mncode/pkg/agent"
	"mncode/pkg/config"
)

func powerToolsApp(root string, withSession bool) *App {
	app := NewApp()
	app.workspace = WorkspaceInfo{Path: root, Ready: true}
	if withSession {
		app.session = &sessionRuntime{session: &agent.Session{
			ID: "desktop-test-session", WorkspaceDir: root,
			Config: &config.Config{Provider: config.ProviderOpenAI, Model: "test-model"},
		}}
	}
	return app
}

func TestPowerToolBindingsRequireWorkspace(t *testing.T) {
	app := NewApp()
	if _, err := app.GetDriftReport(); err == nil {
		t.Fatal("drift binding accepted a missing workspace")
	}
	if _, err := app.ListSandboxFixtures(); err == nil {
		t.Fatal("sandbox binding accepted a missing workspace")
	}
	if _, err := app.QueryCodeIndex("anything", "", "", 10); err == nil {
		t.Fatal("index binding accepted a missing workspace")
	}
	if _, err := app.ListReplayTraces(); err == nil {
		t.Fatal("replay binding accepted a missing workspace")
	}
	if _, err := app.ListSpecContracts(); err == nil {
		t.Fatal("spec binding accepted a missing workspace")
	}
}

func TestPowerToolListsHandleFreshWorkspace(t *testing.T) {
	app := powerToolsApp(t.TempDir(), false)
	if _, err := app.GetDriftReport(); err != nil {
		t.Fatalf("GetDriftReport() on fresh workspace: %v", err)
	}
	if fixtures, err := app.ListSandboxFixtures(); err != nil || len(fixtures) != 0 {
		t.Fatalf("ListSandboxFixtures() = %#v, %v", fixtures, err)
	}
	if traces, err := app.ListReplayTraces(); err != nil || len(traces) != 0 {
		t.Fatalf("ListReplayTraces() = %#v, %v", traces, err)
	}
	if contracts, err := app.ListSpecContracts(); err != nil || len(contracts) != 0 {
		t.Fatalf("ListSpecContracts() = %#v, %v", contracts, err)
	}
}
func TestDriftUsesWorkspacePolicy(t *testing.T) {
	root := t.TempDir()
	policyDir := filepath.Join(root, ".mncode", "drift")
	if err := os.MkdirAll(policyDir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(policyDir, "policy.json"), []byte(`{"deny_cycles":true}`), 0o600); err != nil {
		t.Fatal(err)
	}
	baseline, err := powerToolsApp(root, false).AcceptDriftBaseline()
	if err != nil {
		t.Fatal(err)
	}
	if baseline == nil || !baseline.Policy.DenyCycles {
		t.Fatalf("workspace drift policy was not applied: %#v", baseline)
	}
}
func TestReplayRecordingLifecycle(t *testing.T) {
	app := powerToolsApp(t.TempDir(), true)
	traceID, err := app.StartReplayRecording()
	if err != nil || traceID == "" {
		t.Fatalf("StartReplayRecording() = %q, %v", traceID, err)
	}
	if got := app.GetReplayRecordingID(); got != traceID {
		t.Fatalf("GetReplayRecordingID() = %q, want %q", got, traceID)
	}
	if _, err := app.StartReplayRecording(); err == nil {
		t.Fatal("starting a second recorder should fail")
	}
	if err := app.StopReplayRecording(); err != nil {
		t.Fatalf("StopReplayRecording() error = %v", err)
	}
	if got := app.GetReplayRecordingID(); got != "" {
		t.Fatalf("GetReplayRecordingID() after stop = %q, want empty", got)
	}
	if err := app.StopReplayRecording(); err == nil {
		t.Fatal("stopping an inactive recorder should fail")
	}
	traces, err := app.ListReplayTraces()
	if err != nil || len(traces) != 1 || !traces[0].Complete {
		t.Fatalf("ListReplayTraces() = %#v, %v", traces, err)
	}
}

func TestQueryCodeIndexBuildsOnFirstUse(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "main.go"), []byte("package main\nfunc Hello() {}\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	hits, err := powerToolsApp(root, false).QueryCodeIndex("Hello", "func", "", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) == 0 || hits[0].Symbol != "Hello" {
		t.Fatalf("QueryCodeIndex() = %#v, want Hello symbol", hits)
	}
}

func TestListSpecContractsRejectsMalformedContract(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, ".mncode", "spec")
	if err := os.MkdirAll(path, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(path, "broken.json"), []byte(`{"id":"broken"}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := powerToolsApp(root, false).ListSpecContracts(); err == nil {
		t.Fatal("malformed contract was silently dropped")
	}
}

func TestArenaRequiresProvider(t *testing.T) {
	root := t.TempDir()
	app := powerToolsApp(root, true)
	app.session.session.Provider = nil
	if _, err := app.RunArenaReview("", "", "", 1); err == nil {
		t.Fatal("arena review accepted an unconfigured provider")
	}
}
func TestReplayRecordingStartIsSerialized(t *testing.T) {
	app := powerToolsApp(t.TempDir(), true)
	results := make(chan error, 2)
	for range 2 {
		go func() {
			_, err := app.StartReplayRecording()
			results <- err
		}()
	}
	var successes int
	for range 2 {
		if <-results == nil {
			successes++
		}
	}
	if successes != 1 {
		t.Fatalf("concurrent starts succeeded %d times, want 1", successes)
	}
	if err := app.StopReplayRecording(); err != nil {
		t.Fatal(err)
	}
	traces, err := app.ListReplayTraces()
	if err != nil || len(traces) != 1 {
		t.Fatalf("serialized recording traces = %#v, %v", traces, err)
	}
}
func TestRunSandboxFixtureUsesTemporaryCopy(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "source.txt"), []byte("unchanged"), 0o600); err != nil {
		t.Fatal(err)
	}
	fixtureDir := filepath.Join(root, ".mncode", "sandbox", "fixtures", "echo")
	if err := os.MkdirAll(fixtureDir, 0o700); err != nil {
		t.Fatal(err)
	}
	manifest := `{"schema_version":1,"id":"echo","name":"echo","root":".","command":["echo"],"timeout_seconds":5}`
	if err := os.WriteFile(filepath.Join(fixtureDir, "fixture.json"), []byte(manifest), 0o600); err != nil {
		t.Fatal(err)
	}
	result, err := powerToolsApp(root, false).RunSandboxFixture("echo", []string{"ok"}, false)
	if err != nil {
		t.Fatal(err)
	}
	if result.ExitCode != 0 || result.Stdout != "ok\n" || result.TimedOut || result.Truncated {
		t.Fatalf("unexpected sandbox result: %#v", result)
	}
	data, err := os.ReadFile(filepath.Join(root, "source.txt"))
	if err != nil || string(data) != "unchanged" {
		t.Fatalf("source changed after sandbox run: %q, %v", data, err)
	}
}
