// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package boards

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsBoardsLink(t *testing.T) {
	for _, tc := range []struct {
		link string
		want bool
	}{
		{"https://chat.example.com/kanban/team/t1/b1/v1/c1", true},
		{"https://chat.example.com/sub/kanban/team/t1/b1/v1/c1", true},

		// The path it had as Boards, in older messages.
		{"https://chat.example.com/boards/team/t1/b1/v1/c1", true},
		{"https://chat.example.com/plugins/focalboard/team/t1/shared/b1/v1/c1?r=token", true},
		{"https://chat.example.com/kanban/team/t1/b1", false},
		{"https://chat.example.com/lumen/channels/town-square", false},
	} {
		assert.Equal(t, tc.want, isBoardsLink(tc.link), tc.link)
	}
}

func TestReturnBoardsParamsKanban(t *testing.T) {
	teamID, boardID, viewID, cardID := returnBoardsParams([]string{"kanban", "team", "t1", "b1", "v1", "c1"})
	assert.Equal(t, []string{"t1", "b1", "v1", "c1"}, []string{teamID, boardID, viewID, cardID})
}
