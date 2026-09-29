// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

//go:generate mockgen --build_flags= -destination=mocks/mockservicesapi.go -package mocks . ServicesAPI

package model

import (
	"database/sql"

	"github.com/gorilla/mux"

	am_model "github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const (
	botUsername    = "boards"
	botDisplayname = "Boards"
	botDescription = "Created by Boards plugin."
)

var FocalboardBot = &am_model.Bot{
	Username:    botUsername,
	DisplayName: botDisplayname,
	Description: botDescription,
	OwnerId:     SystemUserID,
}

type ServicesAPI interface {
	// Channels service
	GetDirectChannel(userID1, userID2 string) (*am_model.Channel, error)
	GetDirectChannelOrCreate(userID1, userID2 string) (*am_model.Channel, error)
	GetChannelByID(channelID string) (*am_model.Channel, error)
	GetChannelMember(channelID string, userID string) (*am_model.ChannelMember, error)
	GetChannelsForTeamForUser(teamID string, userID string, includeDeleted bool) (am_model.ChannelList, error)

	// Post service
	CreatePost(post *am_model.Post) (*am_model.Post, error)

	// User service
	GetUserByID(userID string) (*am_model.User, error)
	GetUserByUsername(name string) (*am_model.User, error)
	GetUserByEmail(email string) (*am_model.User, error)
	UpdateUser(user *am_model.User) (*am_model.User, error)
	GetUsersFromProfiles(options *am_model.UserGetOptions) ([]*am_model.User, error)

	// Team service
	GetTeamMember(teamID string, userID string) (*am_model.TeamMember, error)
	CreateMember(teamID string, userID string) (*am_model.TeamMember, error)

	// Permissions service
	HasPermissionTo(userID string, permission *am_model.Permission) bool
	HasPermissionToTeam(userID, teamID string, permission *am_model.Permission) bool
	HasPermissionToChannel(askingUserID string, channelID string, permission *am_model.Permission) bool

	// Bot service
	EnsureBot(bot *am_model.Bot) (string, error)

	// FileInfoStore service
	GetFileInfo(fileID string) (*am_model.FileInfo, error)

	// Cluster service
	PublishWebSocketEvent(event string, payload map[string]interface{}, broadcast *am_model.WebsocketBroadcast)
	PublishPluginClusterEvent(ev am_model.PluginClusterEvent, opts am_model.PluginClusterEventSendOptions) error

	// Config service
	GetConfig() *am_model.Config

	// Logger service
	GetLogger() mlog.LoggerIFace

	// KVStore service
	KVSetWithOptions(key string, value []byte, options am_model.PluginKVSetOptions) (bool, error)

	// Store service
	GetMasterDB() (*sql.DB, error)

	// System service
	GetDiagnosticID() string

	// Router service
	RegisterRouter(sub *mux.Router)

	// Preferences services
	GetPreferencesForUser(userID string) (am_model.Preferences, error)
	UpdatePreferencesForUser(userID string, preferences am_model.Preferences) error
	DeletePreferencesForUser(userID string, preferences am_model.Preferences) error
}
