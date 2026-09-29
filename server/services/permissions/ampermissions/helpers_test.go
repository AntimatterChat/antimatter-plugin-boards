// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package ampermissions

import (
	"testing"

	"github.com/antimatterchat/antimatter-plugin-boards/server/model"
	ampermissionsMocks "github.com/antimatterchat/antimatter-plugin-boards/server/services/permissions/ampermissions/mocks"
	permissionsMocks "github.com/antimatterchat/antimatter-plugin-boards/server/services/permissions/mocks"

	amModel "github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"

	"github.com/golang/mock/gomock"
	"github.com/stretchr/testify/assert"
)

type TestHelper struct {
	t           *testing.T
	ctrl        *gomock.Controller
	store       *permissionsMocks.MockStore
	api         *ampermissionsMocks.MockAPI
	permissions *Service
}

func SetupTestHelper(t *testing.T) *TestHelper {
	ctrl := gomock.NewController(t)
	mockStore := permissionsMocks.NewMockStore(ctrl)
	mockAPI := ampermissionsMocks.NewMockAPI(ctrl)

	return &TestHelper{
		t:           t,
		ctrl:        ctrl,
		store:       mockStore,
		api:         mockAPI,
		permissions: New(mockStore, mockAPI, mlog.CreateConsoleTestLogger(t)),
	}
}

func (th *TestHelper) checkBoardPermissions(roleName string, member *model.BoardMember, teamID string,
	hasPermissionTo, hasNotPermissionTo []*amModel.Permission) {
	setupExpectations := func() {
		th.store.EXPECT().
			GetBoard(member.BoardID).
			Return(&model.Board{ID: member.BoardID, TeamID: teamID}, nil).
			Times(1)

		th.api.EXPECT().
			HasPermissionToTeam(member.UserID, teamID, model.PermissionViewTeam).
			Return(true).
			Times(1)

		th.store.EXPECT().
			GetMemberForBoard(member.BoardID, member.UserID).
			Return(member, nil).
			Times(1)

		if member.SchemeAdmin {
			th.store.EXPECT().
				GetUserByID(member.UserID).
				Return(&model.User{ID: member.UserID, IsGuest: false}, nil).
				Times(1)
		} else {
			th.api.EXPECT().
				HasPermissionToTeam(member.UserID, teamID, model.PermissionManageTeam).
				Return(roleName == "elevated-admin").
				Times(1)
		}
	}

	for _, p := range hasPermissionTo {
		th.t.Run(roleName+" "+p.Id, func(t *testing.T) {
			setupExpectations()
			assert.True(t, th.permissions.HasPermissionToBoard(member.UserID, member.BoardID, p))
		})
	}

	for _, p := range hasNotPermissionTo {
		th.t.Run(roleName+" "+p.Id, func(t *testing.T) {
			setupExpectations()
			assert.False(t, th.permissions.HasPermissionToBoard(member.UserID, member.BoardID, p))
		})
	}
}
