// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

import (
	amModel "github.com/mattermost/mattermost/server/public/model"
)

var (
	PermissionViewTeam              = amModel.PermissionViewTeam
	PermissionManageTeam            = amModel.PermissionManageTeam
	PermissionManageSystem          = amModel.PermissionManageSystem
	PermissionReadChannel           = amModel.PermissionReadChannel
	PermissionCreatePost            = amModel.PermissionCreatePost
	PermissionViewMembers           = amModel.PermissionViewMembers
	PermissionCreatePublicChannel   = amModel.PermissionCreatePublicChannel
	PermissionCreatePrivateChannel  = amModel.PermissionCreatePrivateChannel
	PermissionManageBoardType       = &amModel.Permission{Id: "manage_board_type", Name: "", Description: "", Scope: ""}
	PermissionDeleteBoard           = &amModel.Permission{Id: "delete_board", Name: "", Description: "", Scope: ""}
	PermissionViewBoard             = &amModel.Permission{Id: "view_board", Name: "", Description: "", Scope: ""}
	PermissionManageBoardRoles      = &amModel.Permission{Id: "manage_board_roles", Name: "", Description: "", Scope: ""}
	PermissionShareBoard            = &amModel.Permission{Id: "share_board", Name: "", Description: "", Scope: ""}
	PermissionManageBoardCards      = &amModel.Permission{Id: "manage_board_cards", Name: "", Description: "", Scope: ""}
	PermissionManageBoardProperties = &amModel.Permission{Id: "manage_board_properties", Name: "", Description: "", Scope: ""}
	PermissionCommentBoardCards     = &amModel.Permission{Id: "comment_board_cards", Name: "", Description: "", Scope: ""}
	PermissionDeleteOthersComments  = &amModel.Permission{Id: "delete_others_comments", Name: "", Description: "", Scope: ""}
)
