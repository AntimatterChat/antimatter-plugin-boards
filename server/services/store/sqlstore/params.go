// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package sqlstore

import (
	"database/sql"
	"fmt"

	amModel "github.com/mattermost/mattermost/server/public/model"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

// servicesAPI is the interface required my the Params to interact with the mattermost-server.
// You can use plugin-api or product-api adapter implementations.
type servicesAPI interface {
	GetChannelByID(string) (*amModel.Channel, error)
	GetDirectChannel(userID1, userID2 string) (*amModel.Channel, error)
	GetChannelMember(channelID string, userID string) (*amModel.ChannelMember, error)
	GetChannelsForTeamForUser(teamID string, userID string, includeDeleted bool) (amModel.ChannelList, error)
	GetUserByID(userID string) (*amModel.User, error)
	UpdateUser(user *amModel.User) (*amModel.User, error)
	GetUserByEmail(email string) (*amModel.User, error)
	GetUserByUsername(username string) (*amModel.User, error)
	GetFileInfo(fileID string) (*amModel.FileInfo, error)
	EnsureBot(bot *amModel.Bot) (string, error)
	CreatePost(post *amModel.Post) (*amModel.Post, error)
	GetTeamMember(teamID string, userID string) (*amModel.TeamMember, error)
	GetPreferencesForUser(userID string) (amModel.Preferences, error)
	DeletePreferencesForUser(userID string, preferences amModel.Preferences) error
	UpdatePreferencesForUser(userID string, preferences amModel.Preferences) error
}

type Params struct {
	DBType           string
	ConnectionString string
	DBPingAttempts   int
	TablePrefix      string
	Logger           mlog.LoggerIFace
	DB               *sql.DB
	NewMutexFn       MutexFactory
	ServicesAPI      servicesAPI
	SkipMigrations   bool
	ConfigFn         func() *amModel.Config
}

func (p Params) CheckValid() error {
	if p.NewMutexFn == nil {
		return ErrStoreParam{name: "NewMutexFn", issue: "cannot be nil in plugin mode"}
	}
	return nil
}

type ErrStoreParam struct {
	name  string
	issue string
}

func (e ErrStoreParam) Error() string {
	return fmt.Sprintf("invalid store params: %s %s", e.name, e.issue)
}
