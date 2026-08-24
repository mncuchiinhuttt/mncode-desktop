package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:     "mncode desktop",
		Width:     1440,
		Height:    900,
		MinWidth:  1080,
		MinHeight: 680,
		// Keep the native macOS titlebar hidden/transparent instead of using a
		// fully frameless window. This preserves native edge resizing while the
		// content still fills the titlebar area.
		Mac: &mac.Options{TitleBar: mac.TitleBarHidden()},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 8, G: 9, B: 13, A: 255},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
