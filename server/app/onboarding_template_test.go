// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"archive/zip"
	"bufio"
	"bytes"
	"encoding/json"
	"path"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/antimatterchat/antimatter-plugin-boards/server/assets"
)

// The onboarding tour copies the built-in template titled WelcomeBoardTitle. When Boards became
// Kanban, the template was renamed "Welcome to Kanban!" while WelcomeBoardTitle still said
// "Welcome to Boards!": every "Take a tour" failed with a 500. The tests above mock the store, so
// check the templates the server actually embeds.
func TestWelcomeBoardTitleIsABuiltInTemplate(t *testing.T) {
	archive, err := zip.NewReader(bytes.NewReader(assets.DefaultTemplatesArchive), int64(len(assets.DefaultTemplatesArchive)))
	require.NoError(t, err)

	var titles []string
	for _, f := range archive.File {
		if path.Base(f.Name) != "board.jsonl" {
			continue
		}
		rc, err := f.Open()
		require.NoError(t, err)

		scanner := bufio.NewScanner(rc)
		scanner.Buffer(make([]byte, 0, 64*1024), 16*1024*1024)
		for scanner.Scan() {
			var line struct {
				Type string `json:"type"`
				Data struct {
					Type  string `json:"type"`
					Title string `json:"title"`
				} `json:"data"`
			}
			if len(bytes.TrimSpace(scanner.Bytes())) == 0 {
				continue
			}
			require.NoError(t, json.Unmarshal(scanner.Bytes(), &line), f.Name)
			if line.Type == "board" || line.Data.Type == "board" {
				titles = append(titles, line.Data.Title)
			}
		}
		require.NoError(t, scanner.Err(), f.Name)
		require.NoError(t, rc.Close())
	}

	require.Greater(t, len(titles), 1, "the embedded archive should hold the built-in templates")
	require.Contains(t, titles, WelcomeBoardTitle)
}
