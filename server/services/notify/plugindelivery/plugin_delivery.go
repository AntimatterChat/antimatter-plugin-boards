// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package plugindelivery

import (
	am_model "github.com/mattermost/mattermost/server/public/model"
)

type servicesAPI interface {
	// GetDirectChannelOrCreate gets a direct message channel,
	// or creates one if it does not already exist
	GetDirectChannelOrCreate(userID1, userID2 string) (*am_model.Channel, error)

	// CreatePost creates a post.
	CreatePost(post *am_model.Post) (*am_model.Post, error)

	// GetUserByID gets a user by their ID.
	GetUserByID(userID string) (*am_model.User, error)

	// GetUserByUsername gets a user by their username.
	GetUserByUsername(name string) (*am_model.User, error)

	// GetTeamMember gets a team member by their user id.
	GetTeamMember(teamID string, userID string) (*am_model.TeamMember, error)

	// GetChannelByID gets a Channel by its ID.
	GetChannelByID(channelID string) (*am_model.Channel, error)

	// GetChannelMember gets a channel member by userID.
	GetChannelMember(channelID string, userID string) (*am_model.ChannelMember, error)

	// CreateMember adds a user to the specified team. Safe to call if the user is
	// already a member of the team.
	CreateMember(teamID string, userID string) (*am_model.TeamMember, error)
}

// PluginDelivery provides ability to send notifications to direct message channels via Antimatter plugin API.
type PluginDelivery struct {
	botID      string
	serverRoot string
	api        servicesAPI
}

// New creates a PluginDelivery instance.
func New(botID string, serverRoot string, api servicesAPI) *PluginDelivery {
	return &PluginDelivery{
		botID:      botID,
		serverRoot: serverRoot,
		api:        api,
	}
}
