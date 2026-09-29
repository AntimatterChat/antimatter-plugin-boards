//go:generate mockgen -destination=mocks/mockstore.go -package mocks . Store

// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package permissions

import (
	"github.com/antimatterchat/antimatter-plugin-boards/server/model"

	amModel "github.com/mattermost/mattermost/server/public/model"
)

type PermissionsService interface {
	HasPermissionTo(userID string, permission *amModel.Permission) bool
	HasPermissionToTeam(userID, teamID string, permission *amModel.Permission) bool
	HasPermissionToChannel(userID, channelID string, permission *amModel.Permission) bool
	HasPermissionToBoard(userID, boardID string, permission *amModel.Permission) bool
}

type Store interface {
	GetBoard(boardID string) (*model.Board, error)
	GetMemberForBoard(boardID, userID string) (*model.BoardMember, error)
	GetBoardHistory(boardID string, opts model.QueryBoardHistoryOptions) ([]*model.Board, error)
	GetUserByID(userID string) (*model.User, error)
}
